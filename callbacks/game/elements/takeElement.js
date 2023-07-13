const bot = require('../../../bot');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const getChatSession = require('../../../functions/getters/getChatSession');
const elementsMessage = require('../../../functions/game/elements/elementsMessage');
const validateGameSession = require('../../../functions/game/general/validateGameSession');
const getRandomElement = require('../../../functions/game/elements/getRandomElement');
const isRoundEnd = require('../../../functions/game/elements/isRoundEnd');
const isPlayerEndedRound = require('../../../functions/game/elements/isPlayerEndedRound');
const validateEndGame = require('../../../functions/game/elements/validateEndGame');
const endGame = require('../../../functions/game/general/endGame');
const endGameTimer = require('../../../functions/game/general/endGameTimer');

let maxCountRounds = 3;

module.exports = [["elements_take", function (session, callback) {
    let chatId = callback.message.chat.id;

    try {
        let chatSession = getChatSession(chatId);
        let userId = session.userChatData.user.id;
        let game = chatSession.game.elements;

        if (!validateGameSession(chatSession, userId, "elements")) {
            return;
        }

        if (isPlayerEndedRound(game.players[userId], game.currentRound)) {
            return;
        }

        if (validateEndGame(game.currentRound, maxCountRounds)) {
            endGame(chatSession, chatId, game.messageId, true, "elements");
            return;
        }

        if (!isRoundEnd(game.players, game.currentRound)) {
            return;
        }

        endGameTimer(chatSession, 20 * 1000, chatId, "elements");
        getRandomElement(chatSession, userId);
        game.countPresses += 1;

        if (session.game.elements.hasOwnProperty("counter")) {
            session.game.elements.counter = 0;
        }

        session.game.elements.counter += 1;
        game.gameSessionLastUpdateAt = new Date().getTime();

        bot.editMessageText(elementsMessage(chatSession, userId), {
            chat_id: chatId,
            message_id: callback.message.message_id,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Стихия!",
                    callback_data: "elements_take"
                }]]
            }
        });

        if (game.countPresses === game.players.length - 1) {
            game.currentRound += 1;
        }
    } catch (e) {
        debugMessage(`Command: elements_card\nIn: ${chatId} - ${callback.message.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];