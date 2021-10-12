const bot = require('../bot');

module.exports = function (chatId, msg, milliseconds) {
    setTimeout(() => bot.deleteMessage(chatId, msg), milliseconds);
};