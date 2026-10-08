import { withLock } from '../general/chatLock.js';
import listChatIds from '../getters/listChatIds.js';
import Chat from "../../db/models/Chat.js";
import ArenaRating from "../../db/models/ArenaRating.js";
import updateRank from "../../functions/game/arena/updateRank.js";
import arenaWeeklyPrize from "../../template/arenaWeeklyPrizes.js";
import { addArenaTokens, grantArenaMedal, normalizeArenaInventory } from "../game/arena/arenaInventory.js";
import { chatLadder, mailArenaLuckCoins, weekKeyOf } from "../game/arena/arenaLuckRewards.js";

/**
 * Еженедельный ресет арены:
 * - начисляет токены за ранги
 * - выдаёт PvP-медаль, если её ещё нет
 * - топ-10 рейтинга чата получает Монеты удачи (3-5-7-10-15) почтой
 * - сбрасывает все рейтинги до 1000
 */
export default async function() {
    const chatIds = await listChatIds();
    for (const chatId of chatIds) {
        await withLock(chatId, async () => {
            const chat = await Chat.findOne({ chatId });
            if (!chat) return;
            let updated = false;

            // Ladder first: the ranks and the reset below change the ratings.
            const awards = mailArenaLuckCoins(chat, await chatLadder(chat.chatId), weekKeyOf());
            if (awards.length) updated = true;

            for (const member of chat.members) {
                if (member.userChatData?.user?.is_bot) continue;
                const game = member.game;
                if (!game) continue;

                normalizeArenaInventory(game);

                const playerRankCommon = await updateRank(member.userId, "common", chat.chatId);
                const playerRankExpansion = await updateRank(member.userId, "expansion", chat.chatId);
                const rewardCommon = arenaWeeklyPrize.find(r => r.rank === playerRankCommon)?.reward || 0;
                const rewardExpansion = arenaWeeklyPrize.find(r => r.rank === playerRankExpansion)?.reward || 0;

                addArenaTokens(game, rewardCommon + rewardExpansion);
                grantArenaMedal(game);
                updated = true;
            }

            if (updated) {
                await chat.save();
            }
        });
    }

    await ArenaRating.updateMany(
        { mode: { $in: ["common", "expansion"] } },
        { $set: { rating: 1000 } }
    );
}
