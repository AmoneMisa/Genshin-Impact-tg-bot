const botThink = require('../../../functions/game/point21/botThink');
const findWinners = require('../../../functions/game/point21/findWinners');
const endGameMessage = require('./endGameMessage');

module.exports = function (chatSession, chatId, messageId, isDefault = true) {
    if (!chatSession.pointIsStart) {
        return;
    }

    botThink(chatSession);
    let winners = findWinners(chatSession);
    chatSession.pointIsStart = false;
    chatSession.pointGameSessionIsStart = false;
    chatSession.pointPlayers = {};
    chatSession.pointUsedCards = [];
    endGameMessage(winners, chatId, messageId, isDefault);
};