const bot = require('../bot');

module.exports = function (chatId, text, form) {
    return bot.sendMessage(chatId, text, form)
        .then(msg => {
            return msg;
        });
};