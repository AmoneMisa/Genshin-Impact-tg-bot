const {bosses} = require("../../../data");
const sendMessage = require('../../tgBotFunctions/sendMessage');

module.exports = function (chatId, recovery) {
    let boss = bosses[chatId];

    if (recovery && !(boss.hasOwnProperty("hpRegenIntervalId") && boss.hpRegenIntervalId !== null)) {
        return;
    }

    function bossRegenHp(boss, chatId) {
        if (boss.currentHp === boss.hp) {
            return;
        }

        boss.currentHp += Math.ceil(boss.hp * 0.08);

        if (boss.currentHp < 0) {
            boss.currentHp = 0;
        }

        sendMessage(chatId, `Босс восстановил себе хп. Его текущее хп: ${boss.currentHp}`);
    }

    if (boss.skill.effect === "hp_regen") {
        boss.hpRegenIntervalId = +setInterval(() => bossRegenHp(boss, chatId), 60 * 60 * 1000);
    }
};