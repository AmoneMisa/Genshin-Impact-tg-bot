const retryBotRequest = require('./retryBotRequest');

module.exports = function (chatId, msg) {
    if (!msg) {
        return;
    }

    return retryBotRequest(bot => bot.deleteMessage(chatId, msg));
};