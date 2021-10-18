const bot = require('../../bot');
const {myId} = require('../../config');
const {titles} = require('../../data');
const sendMessage = require('../../functions/sendMessage');
const titlesMessage = require('../../functions/game/titles/titlesMessage');
const buttonsDictionary = require('../../dictionaries/buttons');

module.exports = [[/(?:^|\s)\/titles/, (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, titlesMessage(titles[msg.chat.id]), {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        sendMessage(myId, `Command: /titles\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];