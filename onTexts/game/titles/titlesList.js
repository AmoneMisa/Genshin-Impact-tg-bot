const {titles} = require('../../../data');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const titlesMessage = require('../../../functions/game/titles/titlesMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/titles/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    await sendMessage(msg.chat.id, titlesMessage(titles[msg.chat.id]), {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];