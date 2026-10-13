import { withLock } from '../general/chatLock.js';
import listChatIds from '../getters/listChatIds.js';
import Chat from "../../db/models/Chat.js";
import {dailyGacha} from '../game/equipment/gachaDaily.js';

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
    const chatIds = await listChatIds();
    for (const chatId of chatIds) {
        await withLock(chatId, async () => {
            const chat = await Chat.findOne({ chatId });
            if (!chat) return;
            let updated = false;

            for (const member of chat.members) {
                if (member.userChatData?.user?.is_bot) continue;

                const game = member.game;
                if (!game) continue;

                dailyGacha(member);
                updated = true;
            }

            if (updated) {
                await chat.save();
            }
        });
    }
}
