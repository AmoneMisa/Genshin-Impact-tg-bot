import { gainExp } from '../player/vitality.js';
import playerDamagePlayer, {poolPercent} from "../arena/playerDamagePlayer.js";
import calculateIncreaseGuardedResources from "./calculateIncreaseGuardedResources.js";
import buildsTemplate from "../../../template/buildsTemplate.js";
import setLevel from "../player/setLevel.js";
import {starShieldAmount} from "./starShield.js";

/** Crystals a raid can touch: above the palace guard and above the Stars shield (starShield.js). */
export function stealableCrystals(crystals, guardedCrystals, game, now = Date.now()) {
    return Math.max(0, crystals - guardedCrystals - starShieldAmount(game, now));
}

// A raid is an ambush duel: the same auto-fight as the arena (functions/game/arena), for a minute, and
// the target fights back. You succeed by winning it. That makes a raid about as likely to work against a
// Paladin as against a Mage - the old rule (target hp <= 60% after two minutes of a passive target)
// made tanks unraidable and glass classes constant victims, and it ignored every profession skill.
export const RAID_SECONDS = 60;
const DEAD_PERCENT = 0.18;
// Share of the unguarded resources taken: a clean win takes more than a narrow one.
export const NARROW_WIN_SHARE = 0.13;
export const CRUSHING_WIN_SHARE = 0.2;
export const CRUSHING_WIN_POOL = 25;
// Only this many levels of difference count in the exp formula (it used to scale without limit).
export const EXP_LEVEL_DIFF_CAP = 10;

/** Fights the raid: {won, crushing, attackerPercent, defenderPercent, remainHp}. */
export function fightRaid(currentUser, targetUser) {
    const [attackerHp, defenderHp, details] = playerDamagePlayer(currentUser, targetUser, false, false, RAID_SECONDS, false);
    const attackerPercent = attackerHp <= 0 ? 0 : poolPercent(details.attacker);
    const defenderPercent = defenderHp <= 0 ? 0 : poolPercent(details.defender);
    const won = defenderPercent <= DEAD_PERCENT || (attackerPercent > DEAD_PERCENT && attackerPercent > defenderPercent);
    return {won, crushing: won && defenderPercent <= CRUSHING_WIN_POOL, attackerPercent, defenderPercent, remainHp: defenderHp};
}

export default function stealResources(currentUser, targetUser) {
    const buildTemplate = buildsTemplate["palace"];

    if (!targetUser.game.stealImmuneTimer) {
        targetUser.game.stealImmuneTimer = 0;
    }

    if (!canSteal(targetUser)) {
        return { resultCode: 1 }; // иммунитет
    }

    const raid = fightRaid(currentUser, targetUser);
    const remainHp = raid.remainHp;
    if (!raid.won) {
        return { resultCode: 2, remainHp, defenderPercent: raid.defenderPercent, attackerPercent: raid.attackerPercent }; // защитник отбился
    }

    const defenderGold = targetUser.game.inventory.gold || 0;
    const defenderIronOre = targetUser.game.inventory.ironOre || 0;
    const defenderCrystals = targetUser.game.inventory.crystals || 0;

    const stealPercentage = raid.crushing ? CRUSHING_WIN_SHARE : NARROW_WIN_SHARE;
    const guardedResources = calculateIncreaseGuardedResources(
        buildTemplate,
        targetUser.game.builds.palace.currentLvl
    );

    const goldToSteal = Math.ceil(
        Math.max(0, defenderGold - guardedResources.guardedGold) *
        stealPercentage
    );
    const ironOreToSteal = Math.ceil(
        Math.max(0, defenderIronOre - guardedResources.guardedIronOre) *
        stealPercentage
    );
    const crystalsToSteal = Math.ceil(
        stealableCrystals(defenderCrystals, guardedResources.guardedCrystals, targetUser.game) *
        stealPercentage
    );

    // Добавляем атакующему
    currentUser.game.inventory.gold += goldToSteal;
    currentUser.game.inventory.ironOre += ironOreToSteal;
    currentUser.game.inventory.crystals += crystalsToSteal;

    // Списываем у защитника из реального инвентаря (с защитой от отрицательных значений)
    targetUser.game.inventory.gold = Math.max(0, defenderGold - goldToSteal);
    targetUser.game.inventory.ironOre = Math.max(0, defenderIronOre - ironOreToSteal);
    targetUser.game.inventory.crystals = Math.max(0, defenderCrystals - crystalsToSteal);

    // Иммунитет на 2 часа
    targetUser.game.stealImmuneTimer = Date.now() + 2 * 60 * 60 * 1000;

    // Опыт
    const baseExp = Math.ceil(
        Math.max(
            9500,
            currentUser.game.stats.currentExp * 0.077 *
            Math.max(-EXP_LEVEL_DIFF_CAP, Math.min(EXP_LEVEL_DIFF_CAP, targetUser.game.stats.lvl - currentUser.game.stats.lvl)) +
            9500
        )
    );
    const {gained: gainedExp} = gainExp(currentUser, baseExp);
    setLevel(currentUser);

    return {
        resultCode: 0,
        goldToSteal,
        ironOreToSteal,
        crystalsToSteal,
        gainedExp,
        remainHp,
        defenderPercent: raid.defenderPercent,
        crushing: raid.crushing,
    };
}

function canSteal(targetUser) {
    return Date.now() >= targetUser.game.stealImmuneTimer;
}
