const bot = require('../bot');
const {myId} = require('../config');
const dictionary = require('../dictionaries/main');
const buttonsDictionary = require('../dictionaries/buttons');
const sendMessage = require('../functions/sendMessage');

module.exports = [[/(?:^|\s)\/help/, async (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        sendMessage(msg.chat.id, `${dictionary["ru"].help}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        sendMessage(myId, `Command: /help\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];