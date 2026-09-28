/**
 * Returns whether a completed clan investigation (dictionaries/clanInvestigations.js)
 * grants its bonus, e.g. getInvestigationBonus(clan, "swiftStrikes").
 *
 * @param {Object} clan - Clan mongoose document
 * @param {String} key - investigation key
 * @returns {Boolean}
 */
export default function (clan, key) {
    return Boolean(clan?.investigations?.completed?.includes(key));
}
