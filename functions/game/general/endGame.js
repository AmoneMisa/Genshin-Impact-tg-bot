import pointsBotThink from '../point21/botThink.js';
import findWinners from './findWinners.js';
import endGameMessage from './endGameMessage.js';
import setEndGameTimer from './setEndGameTimer.js';

export default function (chatSession, chatId, messageId, isDefault = true, gameName) {
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

    clearTimeout(chatSession.game.elements.startGameTimeout);
    chatSession.game[gameName].startGameTimeout = null;
    clearTimeout(chatSession.game.elements.startBetTimeout);
    chatSession.game[gameName].startBetTimeout = null;

    setEndGameTimer(chatSession, 0, chatId, gameName, null);
};