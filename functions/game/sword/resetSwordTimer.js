import Chat from "../../../db/models/Chat.js";
import getOffset from "../../getters/getOffset.js";
import listChatIds from "../../getters/listChatIds.js";
import { withLock } from "../../general/chatLock.js";

/**
 * Сбрасывает таймер меча у всех игроков в базе.
 * Каждый чат перечитывается и сохраняется под своим локом (иначе VersionError).
 */
export default async function() {
    for (const chatId of await listChatIds()) {
        await withLock(chatId, async () => {
            const chat = await Chat.findOne({chatId});
            if (!chat) return;
            let updated = false;

            for (const member of chat.members) {
                if (
                    member.timerSwordCallback &&
                    member.timerSwordCallback > Date.now()
                ) {
                    member.timerSwordCallback = getOffset();
                    updated = true;
                }
            }

            if (updated) {
                await chat.save();
            }
        });
    }
}
