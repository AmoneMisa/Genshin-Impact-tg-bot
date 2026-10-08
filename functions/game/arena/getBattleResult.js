import playerDamagePlayer, { poolPercent } from './playerDamagePlayer.js';

// 0 - выигрыш атакующего
// 1 - проигрыш атакующего
// 2 - ничья

const DEAD_PERCENT = 0.18;

/**
 * Both fighters fight for a minute (see playerDamagePlayer). Whoever is brought
 * down loses; if both are still standing when time runs out, whoever has the
 * larger share of their hp + cp pool left wins (damage is taken from cp first, so
 * hp alone would hide almost all of it).
 */
export default function (attacker, defender, isBot = false) {
    const [attackerHp, defenderHp, details] = playerDamagePlayer(attacker, defender, isBot, false, 60, true);
    const attackerPercent = attackerHp <= 0 ? 0 : poolPercent(details.attacker);
    const defenderPercent = defenderHp <= 0 ? 0 : poolPercent(details.defender);

    let result;
    if (defenderPercent <= DEAD_PERCENT) {
        result = 0;
    } else if (attackerPercent <= DEAD_PERCENT) {
        result = 1;
    } else if (attackerPercent > defenderPercent) {
        result = 0;
    } else if (defenderPercent > attackerPercent) {
        result = 1;
    } else {
        result = 2;
    }

    return [result, defenderPercent];
};
