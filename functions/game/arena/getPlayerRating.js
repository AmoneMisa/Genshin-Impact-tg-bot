import {arenaRating} from '../../../data.js';

export default function (userId, arenaType, chatId, arenaBot) {
    if (arenaBot) {
        return arenaBot.rating;
    }

    let sortedRating;

    if (!arenaRating["common"][chatId]) {
        arenaRating.common[chatId] = {};
    }

    if (!arenaRating["common"][chatId][userId]) {
        arenaRating.common[chatId][userId] = 1000;
    }

    if (!arenaRating["expansion"][userId]) {
        arenaRating.expansion[userId] = 1000;
    }

    if (arenaType === "common") {
        sortedRating = Array.from(Object.entries(arenaRating[arenaType][chatId])).sort(([playerId1, rating1], [playerId2, rating2]) => rating2 - rating1);
    } else {
        sortedRating = Array.from(Object.entries(arenaRating[arenaType])).sort(([playerId1, rating1], [playerId2, rating2]) => rating2 - rating1);
    }

    let playerIndex = sortedRating.findIndex(([playerId, rating]) => parseInt(playerId) === parseInt(userId));

    if (playerIndex === -1) {
        throw new Error("Игрок не найден");
    }

    let playerRating = sortedRating[playerIndex][1];
    let percentileRating = playerIndex / sortedRating.length;

    return [playerRating, percentileRating];
}