import { getArenaRatingSnapshot } from './ratingStore.js';

/**
 * Получает рейтинг игрока и его процентиль в арене.
 * Для мировой арены рейтинг глобальный и не привязан к текущему чату.
 */
export default async function(userId, arenaType, chatId, arenaBot) {
    if (arenaBot) {
        return [Number(arenaBot.rating) || 1000, null];
    }

    const snapshot = await getArenaRatingSnapshot(userId, arenaType, chatId);
    return [snapshot.rating, snapshot.percentile];
}
