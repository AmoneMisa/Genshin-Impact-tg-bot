import {regenerateResource} from '../game/player/resourceRegen.js';
import { withLock } from '../general/chatLock.js';
import listChatIds from '../getters/listChatIds.js';
import Chat from "../../db/models/Chat.js";

/**
 * Регенерация MP у игроков
 */
export default async function regenMp() {
    const chatIds = await listChatIds();
    for (const chatId of chatIds) {
        await withLock(chatId, async () => {
            const chat = await Chat.findOne({ chatId });
            if (!chat) return;
            let updated = false;

            for (const member of chat.members) {
                if (regenerateResource(member,'mp')) updated = true;
            }

            if (updated) {
                chat.markModified('members');
                await chat.save();
            }
        });
    }
}
