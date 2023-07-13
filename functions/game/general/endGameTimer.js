const endGame = require('./endGame');
const sendMessageWithDelete = require('../../tgBotFunctions/sendMessageWithDelete');
const bot = require('../../../bot');

const messagesMap = {
    points: "очко",
    elements: "элементы"
}

let timeoutId;
module.exports = function (chatSession, timer, chatId, gameName) {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }

    function callEndGame() {
        endGame(chatSession, chatId, null, false, gameName);
        sendMessageWithDelete(chatId, `Игра в ${messagesMap[gameName]} была отменена из-за отстутствия активности участников. Начните новую игру.`, {}, 7000);
        bot.deleteMessage(chatId, chatSession.game[gameName].messageId);
    }

    timeoutId = setTimeout(() => callEndGame(), timer);
};