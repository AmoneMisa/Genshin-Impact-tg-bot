const bot = require('../../../bot');
const {myId, friendId} = require('../../../config');
const sendMessage = require('../../../functions/sendMessage');
const {bosses} = require('../../../data');
const debugMessage = require('../../../functions/debugMessage');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');

module.exports = [[/(?:^|\s)\/kill\b/, (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        if (msg.from.id !== myId && msg.from.id !== friendId) {
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