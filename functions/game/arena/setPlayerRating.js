import ArenaRating from "../../../db/models/ArenaRating.js";

/**
 * Обновляет рейтинг игрока
 * @param {Number} userId - ID игрока
 * @param {String} arenaType - "common" или "expansion"
 * @param {Number} chatId - ID чата (для common)
 * @param {Number} points - количество очков для добавления
 */
export default async function(userId, arenaType, chatId, points) {
    const query = arenaType === "common"
        ? { userId, chatId, mode: "common" }
        : { userId, mode: "expansion" };

    const update = { $inc: { rating: points } };

    const options = { upsert: true, new: true };

    const ratingDoc = await ArenaRating.findOneAndUpdate(query, update, options);

    return ratingDoc.rating;
}
