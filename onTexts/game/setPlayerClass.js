const bot = require('../../bot');
const debugMessage = require('../../functions/debugMessage');
const sendMessage = require('../../functions/sendMessage');
const buttonsDictionary = require('../../dictionaries/buttons');

module.exports = [[/(?:^|\s)\/my_class\b/, (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, `@${session.userChatData.user.username}, выбери, свой класс.`, {
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [[{
                    text: "Воин",
                    callback_data: "set_class.warrior"
                }, {
                    text: "Маг",
                    callback_data: "set_class.mage"
                }], [{
                    text: "Прист",
                    callback_data: "set_class.priest"
                }, {
                    text: "Лучник",
                    callback_data: "set_class.archer"
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        })
    } catch (e) {
        debugMessage(`Command: /my_class\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];