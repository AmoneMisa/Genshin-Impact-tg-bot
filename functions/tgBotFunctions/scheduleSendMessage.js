const sendMessage = require("./sendMessage");
const retryBotRequest = require("./retryBotRequest");

module.exports = function (chatId, text, form, timestamp) {
    if (timestamp <= new Date().getTime()) {
        return;
    }

    setTimeout(() => retryBotRequest(bot => sendMessage(chatId, text, form)),  Math.max(0, timestamp - new Date().getTime()));
};