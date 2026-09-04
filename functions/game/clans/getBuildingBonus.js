import clanBuildings from "../../../dictionaries/clanBuildings.js";

/**
 * Returns the additive bonus fraction a clan building grants at its current
 * level, e.g. a level-3 mainHall (+5%/level) returns 0.15. Callers apply it as
 * a multiplier: value * (1 + getBuildingBonus(clan, "mainHall")).
 *
 * Reads the level from clan.buildings[key].level (Mixed sub-doc, 0 if absent)
 * and the per-level rate from dictionaries/clanBuildings.js — the single source
 * of truth for building effects.
 *
 * @param {Object} clan - Clan mongoose document
 * @param {String} key - building key ("mainHall" | "barracks" | "treasury")
 * @returns {Number} additive bonus fraction (0 when the building is missing)
 */
export default function (clan, key) {
    const def = clanBuildings.find(b => b.key === key);
    if (!def) {
        return 0;
    }
    const level = clan?.buildings?.[key]?.level || 0;
    return level * def.effectPerLevel;
}
