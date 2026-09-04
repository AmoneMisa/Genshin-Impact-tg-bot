import getSession from "../../getters/getSession.js";
import getChatSession from "../../getters/getChatSession.js";

/**
 * Сбрасывает состояние игры "баскетбол" для игрока
 * @param {Number} chatId - ID чата
 * @param {Number} userId - ID игрока
 */
export default async function(chatId, userId) {
    const chat = await getChatSession(chatId);

    const member = await getSession(chatId, userId);
    if (!member) throw new Error(`Игрок ${userId} не найден в чате ${chatId}`);

    member.game.basketball = {
        bet: 0,
        ball: 0,
        counter: 0,
        isStart: false
    };

    await chat.save();
    return member.game.basketball;
}
