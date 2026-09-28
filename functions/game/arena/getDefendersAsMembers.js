import Chat from "../../../db/models/Chat.js";
import User from "../../../db/models/User.js";
import getArenaBots from "./getArenaBots.js";

/**
 * Получает список участников арены (с ботами или без)
 * @param {String} arenaType - "common" или "expansion"
 * @param {Number} chatId - ID чата
 * @param {Number} callerId - ID вызывающего игрока
 * @param {Boolean} withBots - добавлять ли временных ботов
 * @param {Number} rating - рейтинг игрока для подбора ботов
 */
export default async function(arenaType, chatId, callerId, withBots, rating) {
    let members = [];

    if (arenaType === "expansion") {
        // expansion: собираем всех игроков из всех чатов
        const chats = await Chat.find();
        for (const chat of chats) {
            for (const member of chat.members) {
                const user = await User.findOne({ userId: member.userId });
                if (user?.userChatData?.user?.is_bot) continue;
                members.push(member);
            }
        }
    } else {
        // common: только из одного чата
        const chat = await Chat.findOne({ chatId });
        if (chat) {
            for (const member of chat.members) {
                const user = await User.findOne({ userId: member.userId });
                if (user?.userChatData?.user?.is_bot) continue;
                members.push(member);
            }
        }
    }

    // фильтруем участников
    let filteredMembers = members.filter(
        m => m.userId !== callerId && !m.isHided
    );

    if (withBots) {
        const arenaBots = await getArenaBots(rating);
        if (arenaBots.length > 0) {
            filteredMembers = filteredMembers.concat(arenaBots);
        }
    }

    return filteredMembers;
}
