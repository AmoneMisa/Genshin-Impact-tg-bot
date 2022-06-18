const endGame = require('./endGame');
const endGameMessage = require('./endGameMessage');

let timeoutId;
module.exports = function (chatSession, timer, chatId) {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }

    function callEndGame() {
        endGame(chatSession);
        endGameMessage(chatSession, chatId, null, false);
    }

    timeoutId = setTimeout(() => callEndGame(), timer);
};