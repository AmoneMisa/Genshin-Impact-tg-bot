// A single comparable "power" number for a (level-scaled) class stat block. It
// is what the class tree is balanced against, and it is the geometric mean of
// two views of the same class:
//
//   PvE (bosses): attack, crits, speed, hp, defence as a capped mitigation
//     (damageMitigation: at most -50%). Accuracy, evasion and block do not
//     matter: bosses neither miss nor get dodged.
//   PvP (arena, steal): damage divides by defence (linear), hits roll against
//     the chance-to-hit table (accuracy - evasion, clamped) and defenders block
//     with their block stat. (Mage/priest lines only skip the roll against a
//     defender 8+ levels above, which does not matter between equals.)
//
// A branch that trades attack for defence or evasion is therefore balanced for
// both modes. Used by the tree builder and by the balance tests.
import damageMitigation, { defenceReference } from './damageMitigation.js';
import chanceToHit from '../../../template/chanceToHitTemplate.js';

// What the average opponent looks like: the six base classes' mean evasion, and
// their accuracies.
const REFERENCE_EVASION = 51;
const REFERENCE_ACCURACIES = [60, 80, 65, 115, 105, 70];

/** Chance (0..1) that an attack with `accuracy` lands on `evasion` (arena rules). */
export function hitChance(accuracy, evasion) {
    const diff = Math.max(-25, Math.min(10, accuracy - evasion));
    return chanceToHit[Math.round(diff + 25)] / 100;
}

/** Average chance a reference attacker lands on a defender with this evasion. */
function incomingHitChance(evasion) {
    return REFERENCE_ACCURACIES.reduce((sum, accuracy) => sum + hitChance(accuracy, evasion), 0) / REFERENCE_ACCURACIES.length;
}

/** Share of a hit that gets through the defender's block (arena rules). */
function blockPassRate(block) {
    const rate = Math.max(0, (block - 1) / (135 - 1));
    const chance = 0.0175 + (0.65 - 0.0175) * rate;
    return 1 - chance * rate * 0.67;
}

function critFactor(stats) {
    return 1 + (stats.criticalChance / 100) * (stats.criticalDamage - 1);
}

export function offence(stats) {
    return stats.attack * critFactor(stats) * stats.additionalDamageMul * (stats.speed / 100) * (1 + stats.accuracy / 400);
}

export function toughness(stats, lvl = 1) {
    return stats.maxHp / damageMitigation(stats.defence, lvl) / stats.incomingDamageModifier * (1 + stats.evasion / 300 + stats.block / 400);
}

export function pvePower(stats, lvl = 1) {
    const offensive = stats.attack * critFactor(stats) * stats.additionalDamageMul * (stats.speed / 100);
    const defensive = stats.maxHp / damageMitigation(stats.defence, lvl) / stats.incomingDamageModifier;
    return Math.sqrt(offensive * defensive);
}

export function pvpPower(stats, lvl = 1) {
    const accuracy = hitChance(stats.accuracy, REFERENCE_EVASION);
    const offensive = stats.attack * critFactor(stats) * stats.additionalDamageMul * accuracy;
    const defensive = stats.maxHp * Math.max(stats.defence, 1) / defenceReference(lvl)
        / stats.incomingDamageModifier / incomingHitChance(stats.evasion) / blockPassRate(stats.block);
    return Math.sqrt(offensive * defensive);
}

export default function classPower(stats, lvl = 1) {
    return Math.sqrt(pvePower(stats, lvl) * pvpPower(stats, lvl));
}
