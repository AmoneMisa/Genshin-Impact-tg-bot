import getBuildingBonus from "./getBuildingBonus.js";
import calcReputationPoints from "./calcReputationPoints.js";

/**
 * Adds experience to a clan and recomputes its level.
 *
 * Level curve is intentionally simple and flat: every 1000 xp is one level.
 * The mainHall building boosts all incoming xp (see dictionaries/clanBuildings.js).
 * Mutates the passed clan document in place (caller is responsible for save()).
 *
 * @param {Object} clan - Clan mongoose document
 * @param {Number} amount - xp to add (can be 0)
 * @returns {{leveledUp: Boolean, level: Number}}
 */
const XP_PER_LEVEL = 1000;

export default function (clan, amount) {
    const previousLevel = clan.level || 1;

    const gained = Math.floor(Math.max(0, amount) * (1 + getBuildingBonus(clan, "mainHall")));
    clan.xp = (clan.xp || 0) + gained;
    clan.level = 1 + Math.floor(clan.xp / XP_PER_LEVEL);
    clan.reputation = calcReputationPoints(clan);

    return { leveledUp: clan.level > previousLevel, level: clan.level };
}
