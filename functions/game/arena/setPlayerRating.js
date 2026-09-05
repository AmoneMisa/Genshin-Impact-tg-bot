import { adjustArenaRating } from './ratingStore.js';

/**
 * Атомарно добавляет/вычитает очки рейтинга.
 */
export default async function(userId, arenaType, chatId, points) {
    return adjustArenaRating(userId, arenaType, chatId, points);
}
