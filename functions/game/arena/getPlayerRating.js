const data = require("../../../data");

module.exports = function (userId, arenaType, chatId) {
    let sortedRating;

    if (!data.arenaRating["common"][chatId]) {
        data.arenaRating.common[chatId] = {};
    }

    if (!data.arenaRating["common"][chatId][userId]) {
        data.arenaRating.common[chatId][userId] = {
            rating: 1000
        };
    }

    if (!data.arenaRating["expansion"][userId]) {
        data.arenaRating.expansion[userId] = {
            rating: 1000
        };
    }

    if (arenaType === "common") {
        sortedRating = Array.from(Object.entries(data.arenaRating[arenaType][chatId])).sort(([playerId1, rating1], [playerId2, rating2]) => rating2 - rating1);
    } else {
        sortedRating = Array.from(Object.entries(data.arenaRating[arenaType])).sort(([playerId1, rating1], [playerId2, rating2]) => rating2 - rating1);
    }

    let playerIndex = sortedRating.findIndex(([playerId, rating]) => parseInt(playerId) === userId);

    if (playerIndex === -1) {
        throw new Error("Игрок не найден");
    }

    let playerRating = sortedRating[playerIndex][1];
    let percentileRating = playerIndex / sortedRating.length;

    return [playerRating, percentileRating];
}