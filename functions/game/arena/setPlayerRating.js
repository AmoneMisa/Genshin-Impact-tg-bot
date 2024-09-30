import { arenaRating } from '../../../data.js';

export default function (userId, arenaType, chatId, points) {
    if (arenaType === "common") {
        arenaRating[arenaType][chatId][userId] += points;
    } else {
        arenaRating[arenaType][userId] += points;
    }
}