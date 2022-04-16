const sendMessage = require("./sendMessage");
const retryBotRequest = require("./retryBotRequest");

module.exports = async function (chatId, text, form, timeout) {
    let message = await sendMessage(chatId, text, form);
    setTimeout(() => retryBotRequest(bot => bot.deleteMessage(message.chat.id, message.message_id)), timeout);
};