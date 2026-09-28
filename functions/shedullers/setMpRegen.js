import Chat from "../../db/models/Chat.js";
import getMaxMp from "../game/player/getters/getMaxMp.js";
import getCurrentMp from "../game/player/getters/getCurrentMp.js";

/**
 * Регенерация MP у игроков
 */
export default async function regenMp() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        let updated = false;

        for (const member of chat.members) {
            if (member.userChatData?.user?.is_bot) continue;

            const gameClass = member.game?.gameClass;
            if (!gameClass?.stats) continue;

            const currentMp = getCurrentMp(member);
            const maxMp = getMaxMp(member);

            // Если MP уже на максимуме
            if (currentMp === maxMp) continue;

            // Если MP выше максимума — обрезаем
            if (currentMp > maxMp) {
                gameClass.stats.mp = maxMp;
                updated = true;
                continue;
            }

            // Если MP отрицательный — обнуляем
            if (currentMp < 0) {
                gameClass.stats.mp = 0;
                updated = true;
                continue;
            }

            // Скорость регена
            const mpRegenSpeed = gameClass.stats.mpRestoreSpeed || 0;

            // Применяем реген
            gameClass.stats.mp = Math.min(maxMp, currentMp + mpRegenSpeed);
            updated = true;
        }

        if (updated) {
            await chat.save();
        }
    }
}
