const editMessageText = require('../../../functions/tgBotFunctions/editMessageText');
const getChatSession = require('../../../functions/getters/getChatSession');
const elementsMessage = require('../../../functions/game/elements/elementsMessage');
const validateGameSession = require('../../../functions/game/general/validateGameSession');
const getRandomElement = require('../../../functions/game/elements/getRandomElement');
const isRoundEnd = require('../../../functions/game/elements/isRoundEnd');
const isPlayerEndedRound = require('../../../functions/game/elements/isPlayerEndedRound');
const validateEndGame = require('../../../functions/game/elements/validateEndGame');
const updatePoints = require('../../../functions/game/elements/updatePoints');
const endGame = require('../../../functions/game/general/endGame');
const endGameTimer = require('../../../functions/game/general/endGameTimer');

let maxCountRounds = 3;

module.exports = [["elements_take", function (session, callback) {
    let chatId = callback.message.chat.id;

    let chatSession = getChatSession(chatId);
    let userId = session.userChatData.user.id;
    let game = chatSession.game.elements;

    if (!validateGameSession(game, userId, "elements")) {
        return;
    }

    if (!game.players[userId].hasOwnProperty("counter")) {
        game.players[userId].counter = 0;
    }

    if (!game.hasOwnProperty("currentRound")) {
        game.currentRound = 1;
    }

    if (isPlayerEndedRound(game.players[userId], game.currentRound)) {
        return;
    }

    endGameTimer(chatSession, 20 * 1000, chatId, "elements");
    getRandomElement(chatSession, userId);
    game.players[userId].counter++;

    let roundEnd = isRoundEnd(game.players, game.currentRound);

    if (roundEnd) {
        game.currentRound++;
        updatePoints(game.players);
    }

    game.gameSessionLastUpdateAt = new Date().getTime();

    editMessageText(elementsMessage(chatSession, userId), {
        chat_id: chatId,
        message_id: game.messageId,
        reply_markup: {
            inline_keyboard: [[{
                text: "Стихия!",
                callback_data: "elements_take"
            }]]
        }
    });

    if (roundEnd && validateEndGame(game.currentRound, maxCountRounds)) {
        endGame(chatSession, chatId, game.messageId, true, "elements");
    }
}]];