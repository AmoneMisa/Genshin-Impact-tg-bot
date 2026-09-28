import User from "../../db/models/User.js";
import userTemplate from "../../template/userTemplate.js";
import bot from "../../bot.js";

/**
 * Гарантированно возвращает User:
 * - если пользователя нет — создаёт
 * - обновляет User.userChatData
 * - возвращает полноценный User документ
 */
export default async function(chatId, userId) {
    const userIdStr = userId.toString();

    let chatMemberData;
    try {
        chatMemberData = await bot.getChatMember(chatId, userId);
    } catch (e) {
        throw new Error(`${chatId} ${userIdStr} - getChatMember error: ${e}`);
    }

    await User.updateOne(
        { userId: userIdStr },
        {
            $setOnInsert: { ...userTemplate, userId: userIdStr },
            $set: { userChatData: chatMemberData }
        },
        { upsert: true }
    );

    return await User.findOne({userId: userIdStr});
}
