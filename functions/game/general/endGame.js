const pointsBotThink = require('../point21/botThink');
const elementsBotThink = require('../elements/botThink');
const findWinners = require('./findWinners');
const endGameMessage = require('./endGameMessage');

module.exports = function (chatSession, chatId, messageId, isDefault = true, gameName) {
    if (!chatSession.game[gameName]) {
        return;
    }

    let winners;

    if (gameName === "points") {
        pointsBotThink(chatSession);
    }
    if (gameName === "elements") {
        elementsBotThink(chatSession);
    }

    winners = findWinners(chatSession, gameName);

    chatSession.game[gameName].isStart = false;
    chatSession.game[gameName].gameSessionIsStart = false;
    chatSession.game[gameName].players = {};
    chatSession.game[gameName].usedItems = [];
    endGameMessage(winners, chatId, messageId, isDefault);
};