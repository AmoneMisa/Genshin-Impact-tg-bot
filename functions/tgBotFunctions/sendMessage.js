const retryBotRequest = require("./retryBotRequest");

module.exports = function (chatId, text, form) {
    return retryBotRequest(bot => bot.sendMessage(chatId, text, form));
};