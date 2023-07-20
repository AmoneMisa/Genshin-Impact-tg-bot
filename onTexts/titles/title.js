const debugMessage = require('../../functions/tgBotFunctions/debugMessage');
const sendMessage = require('../../functions/tgBotFunctions/sendMessage');
const titleMessage = require('../../functions/game/titles/titleMessage');
const buttonsDictionary = require('../../dictionaries/buttons');
const deleteMessageTimeout = require('../../functions/tgBotFunctions/deleteMessageTimeout');
const deleteMessage = require("../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/title\b/, (msg, session) => {
        deleteMessage(msg.chat.id, msg.message_id);
        sendMessage(msg.chat.id, titleMessage(msg.chat.id, session), {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        }).then(message => deleteMessageTimeout(msg.chat.id, message.message_id, 15 * 1000));
}]];