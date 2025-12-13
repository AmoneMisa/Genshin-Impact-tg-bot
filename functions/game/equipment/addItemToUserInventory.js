import Chat from "../../../db/models/Chat.js";

/**
 * Добавляет предмет в инвентарь игрока
 * @param {Number} chatId - ID чата
 * @param {Number} userId - ID игрока
 * @param {Object} item - объект предмета
 */
export default async function(chatId, userId, item) {
    const chat = await Chat.findOne({ chatId });
    if (!chat) throw new Error(`Чат ${chatId} не найден`);

    const member = chat.members.find(m => m.userId === userId);
    if (!member) throw new Error(`Игрок ${userId} не найден в чате ${chatId}`);

    if (!member.game?.inventory?.equipment?.items) {
        member.game.inventory.equipment.items = [];
    }

    member.game.inventory.equipment.items.push(item);

    await chat.save();
    return member.game.inventory.equipment.items;
}
