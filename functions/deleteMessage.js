const bot = require('../bot');

module.exports = function (chatId, messages, messageId) {
    let endIndex = messages.indexOf(messageId);

    if (endIndex === -1) {
        return;
    }

    messages.splice(endIndex + 1, messages.length - endIndex - 1).forEach(messageId => {
        bot.deleteMessage(chatId, messageId);
    })
};