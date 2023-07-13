const getWinners = require('./getWinners');
const bot = require('../../../bot');
const sendMessageWithDelete = require('../../tgBotFunctions/sendMessageWithDelete');

module.exports = function (winners, chatId, messageId, isDefault = true) {
    if (isDefault) {
        bot.deleteMessage(chatId, messageId);
    }

    sendMessageWithDelete(chatId, getWinners(winners), {}, 15 * 1000);
};