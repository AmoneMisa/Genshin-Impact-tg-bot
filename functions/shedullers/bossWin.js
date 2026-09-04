import Chat from "../../db/models/Chat.js";
import isBossAlive from "../game/boss/getBossStatus/isBossAlive.js";
import sendMessageWithDelete from "../tgBotFunctions/sendMessageWithDelete.js";

/**
 * Проверяет всех боссов в базе и завершает их, если время жизни истекло
 */
export default async function() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        const boss = chat.game?.gameClass?.boss;
        if (!boss) continue;

        // Проверяем, жив ли босс
        if (!isBossAlive(boss)) continue;

        // Если время жизни ещё не истекло — пропускаем
        if (boss.aliveTime > Date.now()) continue;

        // У всех игроков, кто бил босса, hp = 0
        for (const player of boss.listOfDamage) {
            const member = chat.members.find((m) => m.userId === player.id);
            if (member?.game?.gameClass?.stats) {
                member.game.gameClass.stats.hp = 0;
            }
        }

        // Сбрасываем состояние босса
        boss.skill = null;
        boss.currentHp = 0;
        boss.hp = 0;
        boss.listOfDamage = [];

        await chat.save();

        // Сообщение в чат
        await sendMessageWithDelete(
            chat.chatId,
            "Время для убийства босса истекло. Босс убежал!",
            { disable_notifications: true },
            60 * 1000
        );
    }
}
