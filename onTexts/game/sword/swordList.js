const bot = require('../../../bot');
const debugMessage = require('../../../functions/debugMessage');
const sendMessage = require('../../../functions/sendMessage');
const getMembers = require('../../../functions/getMembers');
const buttonsDictionary = require('../../../dictionaries/buttons');
const swordsMessage = require('../../../functions/game/sword/swordsMessage');

module.exports = [[/(?:^|\s)\/all_swords\b/, async (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let members = getMembers(msg.chat.id);

        sendMessage(msg.chat.id, `${swordsMessage(members)}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        debugMessage(`Command: /all_swords\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];