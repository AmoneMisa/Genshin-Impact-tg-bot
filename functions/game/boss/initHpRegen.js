const {bosses} = require("../../../data");
const sendMessage = require('../../sendMessage');

module.exports = function (chatId, recovery) {
    let boss = bosses[chatId];

    if (recovery && !(boss.hasOwnProperty("hpRegenIntervalId") && boss.hpRegenIntervalId !== null)) {
        return;
    }

    function bossRegenHp(boss, chatId) {
        if (boss.damagedHp === 0) {
            return;
        }

        boss.damagedHp -= Math.ceil(boss.hp * 0.08);

        if (boss.damagedHp < 0) {
            boss.damagedHp = 0;
        }

        sendMessage(chatId, `Босс восстановил себе хп. Его текущее хп: ${boss.hp - boss.damagedHp}`);
    }

    if (boss.skill.effect === "hp_regen") {
        boss.hpRegenIntervalId = +setInterval(() => bossRegenHp(boss, chatId), 60 * 60 * 1000);
    }
};