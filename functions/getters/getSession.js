import getLostFieldsInSession from "./getLostFieldsInSession.js";
import getChatSession from "./getChatSession.js";
import getUser from "./getUser.js";

/**
 * Гарантированно возвращает участника чата:
 * - если чата нет — создаёт
 * - если участника нет — добавляет
 * - обновляет Telegram membership в User
 * - не допускает дублей в Chat.members
 * - всегда возвращает Mongoose subdocument, чтобы изменения можно было сохранить
 */
export default async function(chatId, userId) {
    const userIdStr = userId.toString();
    const chat = await getChatSession(chatId);

    let memberIndex = chat.members.findIndex(m => m.userId?.toString() === userIdStr);

    if (memberIndex < 0) {
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
    // $locals is intentionally non-persistent Mongoose request context. Mini App
    // authorization can inspect the membership we just refreshed without
    // duplicating a Telegram getChatMember request or polluting player state.
    member.$locals.telegramMembership = user?.userChatData || null;

    getLostFieldsInSession(member);
    chat.markModified(`members.${memberIndex}`);
    await chat.save();

    return member;
}
