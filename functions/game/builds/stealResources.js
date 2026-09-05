import calcDamagePlayerToPlayer from "./calcDamagePlayerToPlayer.js";
import calculateIncreaseGuardedResources from "./calculateIncreaseGuardedResources.js";
import buildsTemplate from "../../../template/buildsTemplate.js";
import setLevel from "../player/setLevel.js";
import getMaxHp from "../player/getters/getMaxHp.js";

export default function stealResources(currentUser, targetUser) {
    const remainHp = calcDamagePlayerToPlayer(currentUser, targetUser);
    const buildTemplate = buildsTemplate["palace"];
    const maxHp = getMaxHp(targetUser, targetUser.game.gameClass);

    if (!targetUser.game.stealImmuneTimer) {
        targetUser.game.stealImmuneTimer = 0;
    }

    if (!canSteal(targetUser)) {
        return { resultCode: 1 }; // иммунитет
    }

    if (remainHp / maxHp > 0.6) {
        return { resultCode: 2, remainHp }; // защитник слишком живой
    }

    const defenderGold = targetUser.game.inventory.gold || 0;
    const defenderIronOre = targetUser.game.inventory.ironOre || 0;
    const defenderCrystals = targetUser.game.inventory.crystals || 0;

    const stealPercentage = remainHp >= maxHp ? 0.3 : 0.13;
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
        Math.max(0, defenderCrystals - guardedResources.guardedCrystals) *
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
    const gainedExp = Math.ceil(
        Math.max(
            9500,
            currentUser.game.stats.currentExp * 0.077 *
            (targetUser.game.stats.lvl - currentUser.game.stats.lvl) +
            9500
        )
    );
    currentUser.game.stats.currentExp += gainedExp;
    setLevel(currentUser);

    return {
        resultCode: 0,
        goldToSteal,
        ironOreToSteal,
        crystalsToSteal,
        gainedExp,
        remainHp,
    };
}

function canSteal(targetUser) {
    return Date.now() >= targetUser.game.stealImmuneTimer;
}
