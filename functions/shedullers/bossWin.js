import { sessions, bosses } from '../../data.js';
import isBossAlive from '../game/boss/getBossStatus/isBossAlive.js';
import sendMessageWithDelete from '../tgBotFunctions/sendMessageWithDelete.js';

export default async function () {
    for (let [chatId, bossesArray] of Object.entries(bosses)) {
        for (let boss of bossesArray) {
            if (!isBossAlive(boss)) {
                continue;
            }

            if (boss.aliveTime > new Date().getTime()) {
                return;
            }

            for (let player of boss.listOfDamage) {
                sessions[chatId].members[player.id].game.gameClass.stats.hp = 0;
            }

            boss.skill = null;
            boss.currentHp = 0;
            boss.hp = 0;
            boss.listOfDamage = [];

            await sendMessageWithDelete(chatId, "Время для убийства босса истекло. Босс убежал!", {
                disable_notifications: true}, 60 * 1000);
        }
    }
}