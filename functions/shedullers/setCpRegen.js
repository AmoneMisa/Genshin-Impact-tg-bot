import Chat from "../../db/models/Chat.js";
import isPlayerInFight from "../game/player/isPlayerInFight.js";
import getMaxCp from "../game/player/getters/getMaxCp.js";
import getCurrentCp from "../game/player/getters/getCurrentCp.js";

/**
 * Регенерация CP у игроков
 */
export default async function() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        let updated = false;

        for (const member of chat.members) {
            if (member.userChatData?.user?.is_bot) continue;

            const gameClass = member.game?.gameClass;
            if (!gameClass?.stats) continue;

            const currentCp = getCurrentCp(member);
            const maxCp = getMaxCp(member);

            // Если CP уже на максимуме
            if (currentCp === maxCp) continue;

            // Если CP выше максимума — обрезаем
            if (currentCp > maxCp) {
                gameClass.stats.cp = maxCp;
                updated = true;
                continue;
            }

            // Скорость регена
            let cpRegenSpeed = gameClass.stats.cpRestoreSpeed || 0;

            // В бою реген медленнее
            if (isPlayerInFight(member)) {
                cpRegenSpeed *= 0.2;
            }

            // Применяем реген
            gameClass.stats.cp = Math.min(maxCp, currentCp + cpRegenSpeed);
            updated = true;
        }

        if (updated) {
            await chat.save();
        }
    }
}
