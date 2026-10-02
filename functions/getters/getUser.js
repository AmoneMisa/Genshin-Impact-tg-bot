import User from "../../db/models/User.js";
import userTemplate from "../../template/userTemplate.js";
import bot from "../../bot.js";

/**
 * Гарантированно возвращает User:
 * - если пользователя нет — создаёт
 * - обновляет User.userChatData
 * - возвращает полноценный User документ
 */
const MEMBER_TTL_MS = 60_000;
const memberCache = new Map();

async function getChatMemberCached(chatId, userId) {
    const key = `${chatId}:${userId}`;
    const hit = memberCache.get(key);
    if (hit && hit.expires > Date.now()) return hit.data;

    const data = await bot.getChatMember(chatId, userId);
    memberCache.set(key, { data, expires: Date.now() + MEMBER_TTL_MS });
    if (memberCache.size > 5000) memberCache.delete(memberCache.keys().next().value);
    return data;
}

export default async function(chatId, userId) {
    const userIdStr = userId.toString();

    let chatMemberData;
    try {
        chatMemberData = await getChatMemberCached(chatId, userId);
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
