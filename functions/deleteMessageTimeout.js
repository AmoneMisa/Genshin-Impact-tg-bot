const bot = require('../bot');

module.exports = function (chatId, msg, milliseconds) {
    if (!msg) {
        return;
    }

    setTimeout(() => bot.deleteMessage(chatId, msg), milliseconds);
};