import getLostFieldsInSession from "./getLostFieldsInSession.js";
import getChatSession from "./getChatSession.js";
import getUser from "./getUser.js";
import { attachGuests } from "../general/partyGuests.js";
import { characterStore, guestUsers } from "../general/characterStore.js";

/**
 * Гарантированно возвращает участника чата:
 * - если чата нет — создаёт
 * - если участника нет — добавляет
 * - обновляет User.userChatData
 * - не допускает дублей в Chat.members
 * - возвращает Mongoose subdocument, пригодный для сохранения
 */
export default async function(chatId, userId) {
    const userIdStr = userId.toString();
    const chat = await getChatSession(chatId);

    let memberIndex = chat.members.findIndex(m => m.userId?.toString() === userIdStr);
    let dirty = false;

    if (memberIndex < 0) {
        dirty = true;
        chat.members.push({
            userId,
            isHided: false,
            gender: "male",
            game: {}
        });
        memberIndex = chat.members.length - 1;
    }

    const member = chat.members[memberIndex];
    member.userId = userId;

    const user = await getUser(chatId, userId);
    const before = JSON.stringify(member.toObject?.() ?? member);
    member.userChatData = user.userChatData;

    getLostFieldsInSession(member);
    // Only write when something actually changed: this runs on every request,
    // and a needless whole-document save can clobber concurrent updates.
    if (dirty || JSON.stringify(member.toObject?.() ?? member) !== before) {
        chat.markModified(`members.${memberIndex}`);
        await chat.save();
    }

    // the party of this hero may hold heroes of other chats (and invites may come from them)
    const partyIds = [member.game?.party?.id, ...(member.game?.partyInvites || []).map(invite => invite.partyId)].filter(Boolean);
    if (partyIds.length) await attachGuests(chat, { partyIds }, { store: characterStore, users: guestUsers });

    return member;
}
