const bot = require('../../bot');

module.exports = function (chatId, msg) {
    if (!msg) {
        return;
    }

    bot.deleteMessage(chatId, msg);
};