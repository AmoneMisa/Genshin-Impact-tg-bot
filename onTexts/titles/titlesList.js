const {titles} = require('../../data');
const sendMessage = require('../../functions/tgBotFunctions/sendMessage');
const titlesMessage = require('../../functions/game/titles/titlesMessage');
const buttonsDictionary = require('../../dictionaries/buttons');
const deleteMessage = require("../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/titles/, (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);

    sendMessage(msg.chat.id, titlesMessage(titles[msg.chat.id]), {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];