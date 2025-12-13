import getLostFieldsInSession from "./getLostFieldsInSession.js";
import getChatSession from "./getChatSession.js";
import getUser from "./getUser.js";

/**
 * Гарантированно возвращает участника чата:
 * - если чата нет — создаёт
 * - если участника нет — добавляет
 * - обновляет User.userChatData
 * - не допускает дублей в Chat.members
 */
export default async function(chatId, userId) {
    const userIdStr = userId.toString();

    let chat = await getChatSession(chatId);

    let memberIndex = chat.members.findIndex(m => m.userId?.toString() === userIdStr);
    let member = memberIndex >= 0 ? chat.members[memberIndex] : null;

    if (!member) {
        member = {
            userId: userId,
            isHided: false,
            gender: "male",
            game: {}
        };
        chat.members.push(member);
        memberIndex = chat.members.length - 1;
    } else {
        member.userId = userId;
    }

    await getUser(chatId, userId);

    getLostFieldsInSession(member);
    chat.members[memberIndex].set(member);
    await chat.save();
    return member;
}
