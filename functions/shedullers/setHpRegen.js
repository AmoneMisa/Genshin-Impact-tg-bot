import Chat from "../../db/models/Chat.js";
import isPlayerInFight from "../game/player/isPlayerInFight.js";
import getMaxHp from "../game/player/getters/getMaxHp.js";
import getCurrentHp from "../game/player/getters/getCurrentHp.js";

/**
 * Регенерация HP у игроков
 */
export default async function regenHp() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        let updated = false;

        for (const member of chat.members) {
            if (member.userChatData?.user?.is_bot) continue;

            const gameClass = member.game?.gameClass;
            if (!gameClass?.stats) continue;

            const currentHp = getCurrentHp(member);
            const maxHp = getMaxHp(member);

            // Если HP уже на максимуме
            if (currentHp === maxHp) continue;

            // Если HP выше максимума — обрезаем
            if (currentHp > maxHp) {
                gameClass.stats.hp = maxHp;
                updated = true;
                continue;
            }

            // Если игрок мёртв — не регеним
            if (currentHp <= 0) continue;

            // Скорость регена
            let hpRegenSpeed = gameClass.stats.hpRestoreSpeed || 0;

            // В бою реген медленнее
            if (isPlayerInFight(member)) {
                hpRegenSpeed *= 0.35;
            }

            // Применяем реген
            gameClass.stats.hp = Math.min(maxHp, currentHp + hpRegenSpeed);
            updated = true;
        }

        if (updated) {
            await chat.save();
        }
    }
}
