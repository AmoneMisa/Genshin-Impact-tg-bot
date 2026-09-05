import Boss from "../../db/models/Boss.js";
import Chat from "../../db/models/Chat.js";
import sendMessageWithDelete from "../tgBotFunctions/sendMessageWithDelete.js";

/**
 * Проверяет активных боссов в MongoDB и завершает бой по таймауту.
 */
export default async function() {
    const expiredBosses = await Boss.find({
        hp: { $gt: 0 },
        currentHp: { $gt: 0 },
        aliveTime: { $lte: Date.now() },
    });

    for (const boss of expiredBosses) {
        const chat = await Chat.findOne({ chatId: boss.chatId });
        if (chat) {
            for (const player of boss.listOfDamage || []) {
                const member = chat.members.find(m => String(m.userId) === String(player.id));
                if (member?.game?.gameClass?.stats) {
                    member.game.gameClass.stats.hp = 0;
                    member.game.respawnTime = Date.now() + 60 * 1000;
                }
            }
            await chat.save();
        }

        boss.skill = null;
        boss.currentHp = 0;
        boss.hp = 0;
        boss.listOfDamage = [];
        boss.markModified("skill");
        boss.markModified("listOfDamage");
        await boss.save();

        await sendMessageWithDelete(
            boss.chatId,
            "Время для убийства босса истекло. Босс убежал!",
            { disable_notification: true },
            60 * 1000
        );
    }
}
