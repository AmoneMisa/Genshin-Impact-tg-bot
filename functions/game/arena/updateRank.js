const arenaRanks = require("../../../dictionaries/arenaRanks");
const getPlayerRating = require("./getPlayerRating");

const ranksRating = [
    {minRating: 0, percentileRank: null},
    {minRating: 1000, percentileRank: null},
    {minRating: 1151, percentileRank: null},
    {minRating: 1251, percentileRank: null},
    {minRating: 1301, percentileRank: null},
    {minRating: 1351, percentileRank: null},
    {minRating: 1381, percentileRank: null},
    {minRating: 1421, percentileRank: 0.25},
    {minRating: 1421, percentileRank: 0.20},
    {minRating: 1421, percentileRank: 0.15},
    {minRating: 1500, percentileRank: 0.10},
    {minRating: 1520, percentileRank: 0.07},
    {minRating: 1520, percentileRank: 0.05},
    {minRating: 1580, percentileRank: 0}
].reverse();

module.exports = function (userId, arenaType, chatId) {
    let [playerRating, percentileRating] = getPlayerRating(userId, arenaType, chatId);

    for (let [i, rankRating] of ranksRating.entries()) {
        if (rankRating.minRating <= playerRating) {
            if (!rankRating.percentileRank || rankRating.percentileRank >= percentileRating) {
                return arenaRanks[i];
            }
        }
    }

    throw new Error("Ранг не найден");
}