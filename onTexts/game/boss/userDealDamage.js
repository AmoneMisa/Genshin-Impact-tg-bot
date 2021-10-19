const bossUserSetDamage = require('../../../functions/game/boss/bossUserDealDamage');
const bossGetLoot = require('../../../functions/game/boss/bossGetLoot');
const bot = require('../../../bot');
const {bosses} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const debugMessage = require('../../../functions/debugMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const getMembers = require('../../../functions/getMembers');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');

module.exports = [[/(?:^|\s)\/damage_the_boss\b/, (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        let callbackSendMessage = (message) => sendMessage(msg.chat.id, message, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 60000));

        let boss = bosses[msg.chat.id];
        let members = getMembers(msg.chat.id);

        if (bossUserSetDamage(session, boss, callbackSendMessage)) {
            bossGetLoot(boss, members, callbackSendMessage);
        }
    } catch (e) {
        debugMessage(`Command: /damage_the_boss\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];