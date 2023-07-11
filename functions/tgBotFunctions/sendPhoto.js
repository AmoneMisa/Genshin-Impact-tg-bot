const retryBotRequest = require("./retryBotRequest");

module.exports = function (chatId, photo, form) {
    return retryBotRequest(bot => bot.sendPhoto(chatId, photo, form));
};