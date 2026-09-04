import Chat from "../../db/models/Chat.js";
import gachaTemplate from "../../template/gachaTemplate.js";

/**
 * Сбрасывает бесплатные спины в гача-системе для всех игроков.
 *
 * game.gacha — это МАССИВ записей { name, freeSpins } (см. getLostFieldsInSession
 * и обработчики lucky_roll); отслеживает только ежедневные бесплатные спины.
 * Осколки для призыва хранятся отдельно в inventory.gacha.items. Раньше эта
 * функция перезаписывала поле объектом { name: freeSpins }, ломая .find()/.push()
 * в колбэках гачи. Теперь обновляем только freeSpins и восстанавливаем массив,
 * если он был повреждён.
 */
export default async function resetGachaSpins() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        let updated = false;

        for (const member of chat.members) {
            if (member.userChatData?.user?.is_bot) continue;

            const game = member.game;
            if (!game) continue;

            // Восстанавливаем корректную форму (массив) на случай старых данных.
            if (!Array.isArray(game.gacha)) {
                game.gacha = [];
            }

            for (const template of gachaTemplate) {
                const entry = game.gacha.find(item => item.name === template.name);
                if (entry) {
                    entry.freeSpins = template.freeSpins;
                } else {
                    game.gacha.push({
                        name: template.name,
                        freeSpins: template.freeSpins
                    });
                }
            }

            updated = true;
        }

        if (updated) {
            await chat.save();
        }
    }
}
