import { withLock } from '../general/chatLock.js';
import listChatIds from '../getters/listChatIds.js';
import Chat from "../../db/models/Chat.js";

/**
 * Сбрасывает количество попыток открытия сундука у всех игроков до 1
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

                member.chestTries = 1;
                updated = true;
            }

            if (updated) {
                await chat.save();
            }
        });
    }
}
