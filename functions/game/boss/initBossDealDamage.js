const getMembers = require("../../getMembers");
const bossDealDamage = require("../../game/boss/bossDealDamage");
const {bosses} = require("../../../data");
const bot = require('../../../bot');
const sendMessage = require('../../sendMessage');

module.exports = function (chatId, recovery) {
    let boss = bosses[chatId];

    if (recovery && !(boss.hasOwnProperty("attackIntervalId") && boss.attackIntervalId !== null)) {
        return;
    }

    let members = getMembers(chatId);

    function dealDamage() {
        let message = bossDealDamage(members, boss, chatId);
        if (!message) {
            return;
        }

        return sendMessage(chatId, message)
            .then(message => setInterval(() => bot.deleteMessage(chatId, message.message_id), 10 * 1000));
    }

    boss.attackIntervalId = +setInterval(() => dealDamage(), 10 * 1000);
};