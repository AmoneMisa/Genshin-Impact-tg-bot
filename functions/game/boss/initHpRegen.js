const {bosses} = require("../../../data");
const sendMessage = require('../../tgBotFunctions/sendMessage');
const isBossAlive = require("../../game/boss/getBossStatus/isBossAlive");
const cron = require("node-cron");

module.exports = function () {
    cron.schedule('*/2 * * * *', async () => {
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
                await sendMessage(chatId, `Босс восстановил себе хп. Его текущее хп: ${boss.currentHp}`);
            }
        }
    });
};