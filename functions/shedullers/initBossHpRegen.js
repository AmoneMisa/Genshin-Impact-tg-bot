import { bosses, sessions } from '../../data.js';
import sendMessage from '../tgBotFunctions/sendMessage.js';
import isBossAlive from '../game/boss/getBossStatus/isBossAlive.js';
import cron from 'node-cron';

export default async function () {

    for (let [chatId, bossesArray] of Object.entries(bosses)) {
        for (let boss of bossesArray) {
            if (boss.skill.effect !== "hp_regen") {
                continue;
            }

            if (boss.currentHp === boss.hp) {
                continue;
            }

            if (isBossAlive(boss)) {
                boss.currentHp = 0;
                continue;
            }
            boss.currentHp = Math.max(boss.hp, boss.currentHp + Math.ceil(boss.hp * 1.08));

            if (sessions[chatId].bossSettings.showHealMessage === 0) {
                continue;
            }

            await sendMessage(chatId, `Босс восстановил себе хп. Его текущее хп: ${boss.currentHp}`);
        }
    }
};