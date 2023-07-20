const sendMessage = require('../../functions/tgBotFunctions/sendMessage');
const deleteMessageTimeout = require('../../functions/tgBotFunctions/deleteMessageTimeout');
const deleteMessage = require("../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/remove_keyboard/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    sendMessage(msg.chat.id, "Клавиатура убрана.", {
        reply_markup: JSON.stringify({
            remove_keyboard: true
        })
    }).then(message => {
        setTimeout(() => deleteMessageTimeout(msg.chat.id, message.message_id), 5 * 1000);
    })
}]];