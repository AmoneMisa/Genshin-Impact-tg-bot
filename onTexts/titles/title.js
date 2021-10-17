const bot = require('../../bot');
const {myId} = require('../../config');
const sendMessage = require('../../functions/sendMessage');
const titleMessage = require('../../functions/titles/titleMessage');
const buttonsDictionary = require('../../dictionaries/buttons');
const deleteMessageTimeout = require('../../functions/deleteMessageTimeout');

module.exports = [[/(?:^|\s)\/title\b/, (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, titleMessage(msg.chat.id, session), {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 15000));
    } catch (e) {
        sendMessage(myId, `Command: /title\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];