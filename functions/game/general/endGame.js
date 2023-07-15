const pointsBotThink = require('../point21/botThink');
const findWinners = require('./findWinners');
const endGameMessage = require('./endGameMessage');
const setEndGameTimer = require('./setEndGameTimer');

module.exports = function (chatSession, chatId, messageId, isDefault = true, gameName) {
    if (!chatSession.game[gameName]) {
        return;
    }

    let winners;

    if (gameName === "points") {
        pointsBotThink(chatSession);
    }

    winners = findWinners(chatSession, gameName);

    chatSession.game[gameName].isStart = false;
    chatSession.game[gameName].gameSessionIsStart = false;
    chatSession.game[gameName].players = {};
    chatSession.game[gameName].usedItems = [];

    if (gameName === "elements") {
        chatSession.game.elements.currentRound = 1;
        chatSession.game.elements.countPresses = 0;
    }

    endGameMessage(winners, chatId, messageId, isDefault, gameName);
    setEndGameTimer(chatSession, 0, chatId, gameName, null);
};