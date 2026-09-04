import Chat from "../../db/models/Chat.js";
import ArenaRating from "../../db/models/ArenaRating.js";
import updateRank from "../../functions/game/arena/updateRank.js";
import arenaWeeklyPrize from "../../template/arenaWeeklyPrizes.js";
import pvpSignTemplate from "../../template/pvpSignTemplate.js";
import lodash from "lodash";

/**
 * Еженедельный ресет арены:
 * - начисляет токены за ранги
 * - выдаёт PvP знак
 * - сбрасывает рейтинги до 1000
 */
export default async function() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        let updated = false;

        for (const member of chat.members) {
            if (member.userChatData?.user?.is_bot) continue;

            const game = member.game;
            if (!game?.inventory?.arena) continue;

            // Получаем ранги игрока
            const playerRankCommon = updateRank(member.userId, "common", chat.chatId);
            const playerRankExpansion = updateRank(member.userId, "expansion", chat.chatId);

            // Начисляем токены за оба ранга
            const rewardCommon = arenaWeeklyPrize.find(r => r.rank === playerRankCommon)?.reward || 0;
            const rewardExpansion = arenaWeeklyPrize.find(r => r.rank === playerRankExpansion)?.reward || 0;

            game.inventory.arena.tokens += rewardCommon + rewardExpansion;

            // Выдаём PvP знак, если его нет
            if (lodash.isNull(game.inventory.arena.pvpSign)) {
                game.inventory.arena.pvpSign = { ...pvpSignTemplate };
                game.inventory.arena.pvpSign.lifeTime = Date.now() + pvpSignTemplate.lifeTime;
            }

            updated = true;
        }

        if (updated) {
            await chat.save();
        }
    }

    // Сброс рейтингов в коллекции ArenaRating
    await ArenaRating.updateMany({ type: "expansion" }, { $set: { value: 1000 } });
    await ArenaRating.updateMany({ type: "common" }, { $set: { value: 1000 } });
}
