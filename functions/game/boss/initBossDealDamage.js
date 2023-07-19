const getMembers = require("../../getters/getMembers");
const bossDealDamage = require("../../game/boss/bossDealDamage");
const {bosses} = require("../../../data");
const bot = require('../../../bot');
const sendMessage = require('../../tgBotFunctions/sendMessage');
const deleteMessageTimeout = require("../../tgBotFunctions/deleteMessageTimeout");

module.exports = function (chatId, recovery) {
    let boss = bosses[chatId];

    if (recovery && !(boss.hasOwnProperty("attackIntervalId") && boss.attackIntervalId !== null)) {
        return;
    }

    let members = getMembers(chatId);

    function dealDamage() {
        let message = bossDealDamage(members, boss, chatId);
        if (!message) {
            message = `Босс перебил всю группу и дал дёру. Его можно перепризвать командой /summon_boss.`;
        }

        return sendMessage(chatId, message)
            .then(message => deleteMessageTimeout(chatId, message.message_id, 10 * 1000));
    }

    boss.attackIntervalId = +setInterval(() => dealDamage(), 60 * 60 * 1000);
};