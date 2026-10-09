// The base characteristics of Lineage II (STR, DEX, CON, INT, WIT, MEN) and what they do.
//
// A character starts with the values of the class line (baseStatsData.js) and gear adds points: a Life
// Stone on jewellery, or a `STR`-like stat on an item. Each stat feeds the combat stats with the real
// Lineage II tables (STR 1.036^x, CON 1.030^x, DEX 1.009^x, INT 1.020^x, MEN 1.010^x, WIT 1.050^x),
// softened by DAMPEN and capped, so a stat point is worth a few percent. Only the points above the class
// start count, so a character without gear plays exactly as before.
//
//   STR -> attack (warrior, berserk, archer, rogue)      INT -> attack (mage, priest), healing (priest)
//   DEX -> accuracy, evasion, battle speed, crit chance  CON -> max HP, HP regeneration
//   WIT -> skill cooldowns, crit chance (mage, priest)   MEN -> max mana, mana regeneration
import { classFamily, isMagicClass } from '../classes/classFamily.js';
import getEquipStatByName from './getters/getEquipStatByName.js';
import { BASE_STATS, BASE_STAT_INFO, DEFAULT_BASE_STATS, FAMILY_BASE_STATS } from './baseStatsData.js';

export { BASE_STATS, BASE_STAT_INFO };

const TABLE_BASE = {STR: 1.036, CON: 1.03, DEX: 1.009, INT: 1.02, MEN: 1.01, WIT: 1.05};
const DAMPEN = 0.5;
const MAX_DELTA = 0.5;

const className = session => session?.game?.gameClass?.stats?.name || 'noClass';
const familyOf = session => classFamily(className(session));

export const baseStatsOf = session => FAMILY_BASE_STATS[familyOf(session)] || DEFAULT_BASE_STATS;

/** Points the gear adds to one characteristic. */
export function gearPoints(session, stat) {
    return Number(getEquipStatByName(session, stat)) || 0;
}

export function statTotal(session, stat) {
    return Math.max(1, Math.round((baseStatsOf(session)[stat] + gearPoints(session, stat)) * 10) / 10);
}

/** The share a characteristic adds (0.05 is +5%), from the real table, softened and capped. */
function shareOf(session, stat) {
    const points = gearPoints(session, stat);
    if (!points) return 0;
    const delta = TABLE_BASE[stat] ** (points * DAMPEN) - 1;
    return Math.max(-MAX_DELTA, Math.min(MAX_DELTA, delta));
}

const isMagic = session => isMagicClass(className(session));

/**
 * The delta the characteristics add to a combat stat, in the form getEquipStatByName.js folds it in
 * (0.04 on a "Mul" stat is +4%, on a plain stat it is points). 0 for every stat they do not touch.
 */
export function baseStatDelta(session, statName) {
    switch (statName) {
        case 'attackMul': return shareOf(session, isMagic(session) ? 'INT' : 'STR');
        case 'maxHpMul': return shareOf(session, 'CON');
        case 'maxMpMul': return shareOf(session, 'MEN');
        case 'speedMul': return shareOf(session, 'DEX');
        case 'healPowerMul': return familyOf(session) === 'priest' ? shareOf(session, 'INT') : 0;
        case 'skillCooltimeMul': {
            const wit = shareOf(session, 'WIT');
            return wit ? Math.max(-0.4, -wit / (1 + wit)) : 0;
        }
        case 'accuracy':
        case 'evasion': {
            const points = gearPoints(session, 'DEX');
            if (!points) return 0;
            const base = baseStatsOf(session).DEX;
            // Lineage II: accuracy and evasion grow with the square root of DEX.
            return 6 * (Math.sqrt(Math.max(1, base + points)) - Math.sqrt(base)) * 0.5;
        }
        case 'criticalChance': return gearPoints(session, 'DEX') * 0.3 + (isMagic(session) ? gearPoints(session, 'WIT') * 0.4 : 0);
        case 'hpRestoreSpeed': return gearPoints(session, 'CON') * 0.1;
        case 'mpRestoreSpeed': return gearPoints(session, 'MEN') * 0.1;
        default: return 0;
    }
}

const percent = value => `${value > 0 ? '+' : ''}${Math.round(value * 1000) / 10}%`;

/** The characteristics block of the hero screen. */
export function getBaseStatsState(session) {
    const family = familyOf(session);
    const magic = isMagic(session);
    return BASE_STATS.map(stat => {
        const base = baseStatsOf(session)[stat];
        const bonus = gearPoints(session, stat);
        const share = shareOf(session, stat);
        const active = {
            STR: !magic, INT: magic || family === 'priest', DEX: true, CON: true, MEN: true, WIT: true,
        }[stat];
        return {
            id: stat,
            name: BASE_STAT_INFO[stat].name,
            icon: BASE_STAT_INFO[stat].icon,
            text: BASE_STAT_INFO[stat].text,
            base,
            bonus,
            total: statTotal(session, stat),
            effect: bonus && active ? (stat === 'DEX' ? `точность +${Math.round(baseStatDelta(session, 'accuracy') * 10) / 10}` : percent(share)) : null,
            active,
        };
    });
}
