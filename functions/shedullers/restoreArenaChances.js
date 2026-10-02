import { withLock } from '../general/chatLock.js';
import listChatIds from '../getters/listChatIds.js';
import Chat from "../../db/models/Chat.js";

/**
 * Увеличивает шансы игроков на арену, но не выше лимита
 */
export default async function() {
    const chatIds = await listChatIds();
    for (const chatId of chatIds) {
        await withLock(chatId, async () => {
            const chat = await Chat.findOne({ chatId });
            if (!chat) return;
            let updated = false;

            for (const member of chat.members) {
                if (member.userChatData?.user?.is_bot) continue;

                const game = member.game;
                if (!game) continue;

                // Увеличиваем шансы с лимитом
                game.arenaChances = Math.min(15, (game.arenaChances || 0) + 1);
                game.arenaExpansionChances = Math.min(10, (game.arenaExpansionChances || 0) + 1);

                updated = true;
            }

            if (updated) {
                await chat.save();
            }
        });
    }
}
