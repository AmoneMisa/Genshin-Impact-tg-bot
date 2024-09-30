import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import getChatSession from '../../../functions/getters/getChatSession.js';
import elementsMessage from '../../../functions/game/elements/elementsMessage.js';
import validateGameSession from '../../../functions/game/general/validateGameSession.js';
import getRandomElement from '../../../functions/game/elements/getRandomElement.js';
import isRoundEnd from '../../../functions/game/elements/isRoundEnd.js';
import isPlayerEndedRound from '../../../functions/game/elements/isPlayerEndedRound.js';
import validateEndGame from '../../../functions/game/elements/validateEndGame.js';
import updatePoints from '../../../functions/game/elements/updatePoints.js';
import endGame from '../../../functions/game/general/endGame.js';
import endGameTimer from '../../../functions/game/general/endGameTimer.js';

let maxCountRounds = 3;

export default [["elements_take", function (session, callback) {
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