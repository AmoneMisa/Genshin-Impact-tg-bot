const bossUserSetDamage = require('../../../functions/boss/bossUserDealDamage');
const bossGetLoot = require('../../../functions/boss/bossGetLoot');
const bot = require('../../../bot');
const {myId} = require('../../../config');
const {sessions, bosses} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const getSession = require('../../../functions/getSession');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');

module.exports = [[/(?:^|\s)\/damage_the_boss\b/, async (msg) => {
    try {
        let session = await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);

        let callbackSendMessage = (message) => sendMessage(msg.chat.id, message, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 5000));

        let boss = bosses[msg.chat.id];

        if (bossUserSetDamage(session, boss, callbackSendMessage)) {
            bossGetLoot(boss, sessions[msg.chat.id], callbackSendMessage);
        }
    } catch (e) {
        sendMessage(myId, `Command: /damage_the_boss\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];