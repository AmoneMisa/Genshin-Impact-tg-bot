const getWinners = require('../../../functions/game/point21/getWinners');
const bot = require('../../../bot');
const sendMessageWithDelete = require('../../../functions/sendMessageWithDelete');

module.exports = function (chatSession, chatId, messageId, isDefault = true) {
    if (isDefault) {
        bot.deleteMessage(chatId, messageId);
    }

    sendMessageWithDelete(chatId, getWinners(chatSession), {}, 15 * 1000);
};