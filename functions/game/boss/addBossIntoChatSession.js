import Boss from "../../../db/models/Boss.js";

/**
 * Добавляет босса в чат
 * @param {Number} chatId - ID чата
 * @param {Object} boss - объект босса { name, hp, attack, defense, ... }
 */
export default async function(chatId, boss) {
    // Проверяем, есть ли уже босс с таким именем в этом чате
    const existingBoss = await Boss.findOne({ chatId, name: boss.name });
    if (existingBoss) {
        throw new Error(`Босс с таким именем: ${boss.name} уже есть в чате с айди: ${chatId}`);
    }

    // Создаём нового босса
    return await Boss.create({chatId, ...boss});
}
