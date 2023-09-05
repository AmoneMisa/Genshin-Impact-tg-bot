const {arenaRating} = require("../../../data");

module.exports = function (userId, arenaType, chatId) {
    let sortedRating;

    if (arenaType === "common") {
        sortedRating = Array.from(Object.entries(arenaRating[arenaType][chatId])).sort(([playerId1, rating1], [playerId2, rating2]) => rating2 - rating1);
    } else {
        sortedRating = Array.from(Object.entries(arenaRating[arenaType])).sort(([playerId1, rating1], [playerId2, rating2]) => rating2 - rating1);
    }

    let playerIndex = sortedRating.findIndex(([playerId, rating]) => playerId === userId);

    if (playerIndex === -1) {
        throw new Error("Игрок не найден");
    }

    let playerRating = sortedRating[playerIndex][1];
    let percentileRating = playerIndex / sortedRating.length;

    return [playerRating, percentileRating];
}