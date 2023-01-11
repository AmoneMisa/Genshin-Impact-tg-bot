const endGame = require('./endGame');
const sendMessageWithDelete = require('../../tgBotFunctions/sendMessageWithDelete');
const bot = require('../../../bot');

let timeoutId;
module.exports = function (chatSession, timer, chatId) {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }

    function callEndGame() {
        endGame(chatSession, chatId, null, false);
        sendMessageWithDelete(chatId, "Игра в очко была отменена из-за отстутствия активности участников. Начните новую игру.", {}, 7000);
        bot.deleteMessage(chatId, chatSession.pointMessageId);
    }

    timeoutId = setTimeout(() => callEndGame(), timer);
};