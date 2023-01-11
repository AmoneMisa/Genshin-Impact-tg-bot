const bot = require('../../../bot');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const {bosses} = require('../../../data');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const getMemberStatus = require("../../../functions/getters/getMemberStatus");

module.exports = [[/(?:^|\s)\/kill\b/, (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        if (!getMemberStatus(msg.chat.id, msg.from.id)) {
            return;
        }

        let boss = bosses[msg.chat.id];

        if (boss.hp === 0 && boss.damagedHp === 0) {
            return;
        }

        if (boss.skill.effect === "hp_regen" && boss.hpRegenIntervalId) {
            boss.hpRegenIntervalId = null;
        }

        boss.skill = null;
        clearInterval(boss.attackIntervalId);
        debugMessage("kill", boss.attackIntervalId);
        boss.attackIntervalId = null;
        boss.damagedHp = 0;
        boss.hp = 0;

        sendMessage(msg.chat.id, "Босс убит админом.", {
            disable_notification: true
        }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 5000));
    } catch (e) {
        debugMessage(`Command: /kill\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];