import ArenaRating from "../../../db/models/ArenaRating.js";

/**
 * Получает рейтинг игрока и его процентиль в арене
 * @param {Number} userId - ID игрока
 * @param {String} arenaType - "common" или "expansion"
 * @param {Number} chatId - ID чата
 * @param {Object} arenaBot - если это бот арены, то берём его рейтинг напрямую
 * @returns [playerRating, percentileRating]
 */
export default async function(userId, arenaType, chatId, arenaBot) {
    if (arenaBot) {
        return arenaBot.rating;
    }

    // 1. Проверяем наличие записи
    let ratingDoc = await ArenaRating.findOne({ userId, chatId, mode: arenaType });

    if (!ratingDoc) {
        ratingDoc = await ArenaRating.create({
            userId,
            chatId,
            mode: arenaType,
            rating: 1000
        });
    }

    // 2. Получаем все рейтинги для сортировки
    let ratings;
    if (arenaType === "common") {
        ratings = await ArenaRating.find({ chatId, mode: "common" });
    } else {
        ratings = await ArenaRating.find({ mode: "expansion" });
    }

    // 3. Сортируем по рейтингу
    const sortedRating = ratings
        .map(r => [r.userId, r.rating])
        .sort((a, b) => b[1] - a[1]);

    // 4. Находим индекс игрока
    const playerIndex = sortedRating.findIndex(([id]) => parseInt(id) === parseInt(userId));
    if (playerIndex === -1) {
        throw new Error("Игрок не найден");
    }

    const playerRating = sortedRating[playerIndex][1];
    const percentileRating = playerIndex / sortedRating.length;

    return [playerRating, percentileRating];
}
