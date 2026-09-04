import Chat from "../../../db/models/Chat.js";

/**
 * Получает список построек игрока из MongoDB
 * @param {String} chatId - идентификатор чата
 * @param {String} userId - идентификатор игрока
 * @returns {Array|Object} список построек игрока
 */
export default async function(chatId, userId) {
    const chat = await Chat.findOne({ chatId });
    if (!chat) throw new Error(`Чат ${chatId} не найден`);

    const member = chat.members.find(m => m.userId === userId);
    if (!member) throw new Error(`Игрок ${userId} не найден`);

    return member.game.builds || [];
}
