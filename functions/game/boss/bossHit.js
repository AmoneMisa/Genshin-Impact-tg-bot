// How hard the boss hits. The old model multiplied template damage ranges by
// attack/defence and then by 0.12 - a level-30 fighter lost ~10 hp out of
// 150 000 per cast, so fights had no tension at all. A hit is now a share of
// the *target's* max hp, which keeps fights comparable from level 1 to 99:
//
//   hit = maxHp x dangerPct% x (1 + 0.12 per boss level above 1)
//         x defence mitigation (up to -50%) x class incoming-damage modifier
//         x (1 + enrage) x (1 - weaken) x ~10% spread, rarely a crit
//
// The attack's own `power` and the player's guard / evade / shield are applied
// by the caller (bossCastAttack.js).
import getMaxHp from '../player/getters/getMaxHp.js';
import getDefence from '../player/getters/getDefence.js';
import getIncomingDamageModifier from '../player/getters/getIncomingDamageModifier.js';
import damageMitigation from '../player/damageMitigation.js';
import {bossDebuffAmount} from './bossDebuffs.js';
import {bossTemplateFor} from './bossUnits.js';

export const LEVEL_DANGER_STEP = 0.12;
export const DEFAULT_DANGER_PCT = 3;
const CRIT_CHANCE_SHARE = 0.4;
const CRIT_BONUS_SHARE = 0.6;

/**
 * Base hit of `source` (the boss, or a minion through `unitPower`) on `member`.
 * `random` is injectable for tests.
 */
export default function calcBossHit(boss, member, {now = Date.now(), random = Math.random, unitPower = 1} = {}) {
    const template = bossTemplateFor(boss);
    const gameClass = member.game.gameClass;
    const level = Math.max(1, Number(member.game?.stats?.lvl) || 1);
    const bossLevel = Math.max(1, Number(boss.stats?.lvl) || 1);

    const dangerPct = Number(template?.combat?.dangerPct) || DEFAULT_DANGER_PCT;
    const base = getMaxHp(member, gameClass) * dangerPct / 100;
    const levelScale = 1 + LEVEL_DANGER_STEP * (bossLevel - 1);
    const mitigation = damageMitigation(getDefence(member, gameClass), level);
    const incoming = getIncomingDamageModifier(member, gameClass);
    const enrage = 1 + (Number(boss.enrage) || 0);
    const weaken = 1 - bossDebuffAmount(boss, 'weaken', now);
    const spread = 0.9 + random() * 0.2;

    let dmg = base * levelScale * mitigation * incoming * enrage * weaken * spread * unitPower;

    const critChance = (Number(boss.stats?.criticalChance) || 0) * CRIT_CHANCE_SHARE;
    if (random() * 100 < critChance) {
        dmg *= 1 + ((Number(boss.stats?.criticalDamage) || 1) - 1) * CRIT_BONUS_SHARE;
    }
    return dmg;
}
