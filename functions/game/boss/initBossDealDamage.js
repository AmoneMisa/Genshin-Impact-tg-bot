const getMembers = require("../../getters/getMembers");
const bossDealDamage = require("../../game/boss/bossDealDamage");
const getBossDealDamageMessage = require("../../game/boss/getters/getBossDealDamageMessage");
const getAliveBoss = require("../../game/boss/getBossStatus/getAliveBoss");
const sendMessageWithDelete = require('../../tgBotFunctions/sendMessageWithDelete');

module.exports = function (chatId, recovery) {
    let boss = getAliveBoss(chatId);
    if (!boss) {
        // throw new Error("Босс не найден!");
        return;
    }

    if (recovery && !(boss.hasOwnProperty("attackIntervalId") && boss.attackIntervalId !== null)) {
        return;
    }

    let members = getMembers(chatId);

    function dealDamage() {
        let dmgList = bossDealDamage(members, boss, chatId);
        if (dmgList) {
            return sendMessageWithDelete(chatId, getBossDealDamageMessage(members, dmgList), {}, 10 * 1000);
        }
    }

    boss.attackIntervalId = +setInterval(() => dealDamage(), 60 * 60 * 1000);
};