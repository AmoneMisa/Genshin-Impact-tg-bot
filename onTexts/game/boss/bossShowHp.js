const bot = require('../../../bot');
const {bosses} = require('../../../data');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const bossUsersDamage = require('../../../functions/game/boss/listUsersDamage');
const getMembers = require('../../../functions/getters/getMembers');

module.exports = [[/(?:^|\s)\/boss_hp\b/, async (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let members = getMembers(msg.chat.id);

        sendMessage(msg.chat.id, `${bossUsersDamage(bosses[msg.chat.id], members)}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        debugMessage(`Command: /boss_hp\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];