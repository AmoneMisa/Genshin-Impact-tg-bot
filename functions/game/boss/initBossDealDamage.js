const getMembers = require("../../getMembers");
const bossDealDamage = require("../../game/boss/bossDealDamage");
const {bosses} = require("../../../data");
const bot = require('../../../bot');
const sendMessage = require('../../sendMessage');
const debugMessage = require('../../debugMessage');

module.exports = function (chatId, recovery) {
    let boss = bosses[chatId];
    debugMessage("1");
    if (recovery && !(boss.hasOwnProperty("attackIntervalId") && boss.attackIntervalId !== null)) {
        console.log("2");
        return;
    }

    let members = getMembers(chatId);

    function dealDamage() {
        let message = bossDealDamage(members, boss, chatId);
        if (!message) {
            message = `Босс перебил всю группу и дал дёру. Его можно перепризвать командой /summon_boss.`;
        }

        return sendMessage(chatId, message)
            .then(message => setTimeout(() => bot.deleteMessage(chatId, message.message_id), 10 * 1000));
    }

    boss.attackIntervalId = +setInterval(() => dealDamage(), 60 * 60 * 1000);
    // boss.attackIntervalId = +setInterval(() => dealDamage(), 10 * 1000);
    debugMessage(boss.attackIntervalId);
};