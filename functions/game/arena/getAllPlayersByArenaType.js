import ArenaRating from "../../../db/models/ArenaRating.js";
import getSession from "../../getters/getSession.js";

/**
 * Получает рейтинг или список игроков арены
 * @param {String} arenaType - "common" или "expansion"
 * @param {Number} chatId - ID чата
 * @param {String} type - "rating" или "players"
 */
export default async function(arenaType, chatId, type = "rating") {
    let ratings;

    if (arenaType === "common") {
        ratings = await ArenaRating.find({ chatId, mode: "common" });
    } else {
        ratings = await ArenaRating.find({ mode: "expansion" });
    }

    if (type === "rating") {
        // Вернём объект { userId: rating }
        const currentRating = {};
        ratings.forEach(r => {
            currentRating[r.userId] = r.rating;
        });
        return currentRating;
    }

    // type === "players"
    const players = [];
    for (const r of ratings) {
        let session;
        if (arenaType === "expansion") {
            // ищем игрока в любом чате
            session = await getSession(r.chatId, r.userId);
        } else {
            session = await getSession(chatId, r.userId);
        }
        if (session) players.push(session);
    }

    return players;
}
