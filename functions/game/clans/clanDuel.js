import playerDamagePlayer from "../arena/playerDamagePlayer.js";
import getMaxHp from "../player/getters/getMaxHp.js";

/**
 * Simulates a friendly duel between two live clan members.
 *
 * Reuses the arena combat engine but with isArena=false, so no arena-medal
 * modifiers (getPvpSign) apply — this is a plain skill-vs-skill fight. Both
 * sessions are read only for stats; the engine mutates in-memory effect counts,
 * which the caller discards (never saved), so the duel has no lasting side
 * effects on the players themselves.
 *
 * @param {Object} attacker - challenger member subdoc (current chat)
 * @param {Object} defender - opponent member subdoc (current chat)
 * @returns {{result: number, attackerPercent: number, defenderPercent: number}}
 *          result: 0 attacker wins, 1 attacker loses, 2 draw
 */
export default function (attacker, defender) {
    const [attackerHp, defenderHp] = playerDamagePlayer(attacker, defender, false, false, 60, false);

    const attackerPercent = attackerHp / getMaxHp(attacker, attacker.game.gameClass) * 100;
    const defenderPercent = defenderHp / getMaxHp(defender, defender.game.gameClass) * 100;

    let result;
    if (defenderPercent <= 0.18) {
        result = 0;
    } else if (attackerPercent <= 0.18) {
        result = 1;
    } else if (attackerPercent > defenderPercent) {
        result = 0;
    } else if (defenderPercent > attackerPercent) {
        result = 1;
    } else {
        result = 2;
    }

    return { result, attackerPercent, defenderPercent };
}
