import Chat from "../../../db/models/Chat.js";

/**
 * Сбрасывает состояние игры "боулинг" для игрока
 * @param {Number} chatId - ID чата
 * @param {Number} userId - ID игрока
 */
export default async function(chatId, userId) {
    const chat = await Chat.findOne({ chatId });
    if (!chat) throw new Error(`Чат ${chatId} не найден`);

    const member = chat.members.find(m => m.userId === userId);
    if (!member) throw new Error(`Игрок ${userId} не найден в чате ${chatId}`);

    member.game.bowling = {
        bet: 0,
        skittles: 0,
        counter: 0,
        isStart: false
    };

    await chat.save();
    return member.game.bowling;
}
