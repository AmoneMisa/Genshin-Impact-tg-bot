const getWinners = require('./getWinners');
const bot = require('../../../bot');
const sendMessageWithDelete = require('../../tgBotFunctions/sendMessageWithDelete');

module.exports = function (winners, chatId, messageId, isDefault = true, gameName) {
    if (isDefault) {
        bot.deleteMessage(chatId, messageId);
    }

    sendMessageWithDelete(chatId, getWinners(winners, gameName), {}, 60 * 1000);
};