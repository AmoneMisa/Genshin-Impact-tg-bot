const bot = require('../bot');

module.exports = function (chatId, msg, seconds) {
    setTimeout(() => bot.deleteMessage(chatId, msg), seconds);
};