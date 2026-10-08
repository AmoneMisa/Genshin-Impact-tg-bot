// Weekly arena reward in Coins of Luck: the top ten of a chat's ladder, paid by mail when the
// ladder resets (functions/shedullers/sendArenaWeeklyPrizes.js).
import ArenaRating from '../../../db/models/ArenaRating.js';
import { addMail } from '../../../miniapp/promo.js';

/** Coins per place, 1st to 10th: 15, 10, 7, then 5 for 4th-6th and 3 for 7th-10th. */
export const ARENA_LUCK_COINS = Object.freeze([15, 10, 7, 5, 5, 5, 3, 3, 3, 3]);
export const ARENA_LUCK_PLACES = ARENA_LUCK_COINS.length;

export const arenaLuckCoinsForPlace = place => ARENA_LUCK_COINS[place - 1] || 0;

/**
 * Puts a mail with the prize into every member of the chat that finished in the top ten.
 * `ratings` is the ladder, best first: [{userId, rating}]. Returns the awards, for logging.
 */
export function mailArenaLuckCoins(chat, ratings, weekKey, now = Date.now()) {
    const awards = [];
    ratings.slice(0, ARENA_LUCK_PLACES).forEach((row, index) => {
        const place = index + 1;
        const member = chat.members.find(item => String(item.userId) === String(row.userId));
        if (!member || member.isHided || member.userChatData?.user?.is_bot) return;
        const amount = arenaLuckCoinsForPlace(place);
        const added = addMail(member, {
            id: `arena:${weekKey}`,
            kind: 'arena',
            title: 'Награда арены',
            text: `Ты занял ${place}-е место в рейтинге арены этого чата.`,
            rewards: [{kind: 'luckCoins', amount}],
        }, now);
        if (added) awards.push({userId: member.userId, place, amount});
    });
    return awards;
}

/** The chat's ladder, best first (ties keep the older entry first). */
export async function chatLadder(chatId) {
    return ArenaRating.find({chatId, mode: 'common'}).sort({rating: -1, createdAt: 1}).limit(ARENA_LUCK_PLACES).lean();
}

/** ISO week-style key of the reset moment, so a rerun of the job never pays twice. */
export const weekKeyOf = (date = new Date()) => date.toISOString().slice(0, 10);
