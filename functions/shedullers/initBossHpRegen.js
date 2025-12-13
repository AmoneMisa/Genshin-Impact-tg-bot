import Boss from "../../db/models/Boss.js";
import sendMessage from "../tgBotFunctions/sendMessage.js";
import isBossAlive from "../game/boss/getBossStatus/isBossAlive.js";

export default async function regenBossHp() {
    const bosses = await Boss.find({});

    for (const boss of bosses) {
        if (!boss?.skill || boss.skill.effect !== "hp_regen") continue;

        // Если HP уже на максимуме — пропускаем
        if (boss.currentHp >= boss.hp) continue;

        // Если босс мёртв — пропускаем
        if (!isBossAlive(boss)) continue;

        // Восстанавливаем HP (на 8% от максимального)
        boss.currentHp = Math.min(
            boss.hp,
            boss.currentHp + Math.ceil(boss.hp * 0.08)
        );

        await boss.save();

        // Сообщение в чат
        if (boss.showHealMessage !== 0) {
            await sendMessage(
                boss.chatId,
                `Босс восстановил себе хп. Его текущее хп: ${boss.currentHp}`
            );
        }
    }
}
