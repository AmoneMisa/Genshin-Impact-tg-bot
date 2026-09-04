import Chat from "../../db/models/Chat.js";
import ArenaRating from "../../db/models/ArenaRating.js";
import updateRank from "../../functions/game/arena/updateRank.js";
import arenaWeeklyPrize from "../../template/arenaWeeklyPrizes.js";
import { addArenaTokens, grantArenaMedal, normalizeArenaInventory } from "../game/arena/arenaInventory.js";

/**
 * Еженедельный ресет арены:
 * - начисляет токены за ранги
 * - выдаёт PvP-медаль, если её ещё нет
 * - сбрасывает все рейтинги до 1000
 */
export default async function() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        let updated = false;

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
    }

    await ArenaRating.updateMany(
        { mode: { $in: ["common", "expansion"] } },
        { $set: { rating: 1000 } }
    );
}
