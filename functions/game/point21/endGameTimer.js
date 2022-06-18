const endGame = require('./endGame');

let timeoutId;
module.exports = function (chatSession, timer, chatId) {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }

    function callEndGame() {
        endGame(chatSession, chatId, null, false);
    }

    timeoutId = setTimeout(() => callEndGame(), timer);
};