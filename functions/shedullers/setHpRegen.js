import {regenerateResource} from '../game/player/resourceRegen.js';
import { withLock } from '../general/chatLock.js';
import listChatIds from '../getters/listChatIds.js';
import Chat from "../../db/models/Chat.js";
import {advanceFieldPvp} from '../game/hunt/fieldPvp.js';

/**
 * Регенерация HP у игроков
 */
export default async function regenHp() {
    const chatIds = await listChatIds();
    for (const chatId of chatIds) {
        await withLock(chatId, async () => {
            const chat = await Chat.findOne({ chatId });
            if (!chat) return;
            let updated = advanceFieldPvp(chat);

            for (const member of chat.members) {
                if (regenerateResource(member,'hp')) updated = true;
            }

            if (updated) {
                chat.markModified('members');
                chat.members.forEach((member,index)=>{if(member.needsSave){chat.markModified(`members.${index}`);member.needsSave=false;}});
                await chat.save();
            }
        });
    }
}
