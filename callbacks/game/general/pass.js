const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const getChatSession = require('../../../functions/getters/getChatSession');
const validateGameSession = require('../../../functions/game/general/validateGameSession');
const checkAllPlayersPassed = require('../../../functions/game/general/checkAllPlayersPassed');
const endGame = require('../../../functions/game/general/endGame');
const endGameTimer = require('../../../functions/game/general/endGameTimer');
const getUserName = require('../../../functions/getters/getUserName');

module.exports = [[/[^\b]+_pass$/, async (session, callback) => {
    const [, gameName] = callback.data.match(/([^\b]+)_pass$/);
    try {
        let chatSession = getChatSession(callback.message.chat.id);
        let userId = callback.from.id;

        if (!validateGameSession(chatSession, userId, gameName)) {
            return;
        }

        endGameTimer(chatSession, 20 * 1000, callback.message.chat.id, gameName);
        let players = chatSession.game[gameName].players;
        let player = players[userId];

        player.isPass = true;

        if (checkAllPlayersPassed(chatSession, gameName)) {
            endGame(chatSession, callback.message.chat.id, callback.message.message_id, true, gameName);
            return;
        }

        sendMessage(callback.message.chat.id, `${getUserName(session, "nickname")}, ты спасовал. Больше брать карты и повышать ставку нельзя`)
            .then(message => {
                deleteMessageTimeout(callback.message.chat.id, message.message_id, 7000);
            });

    } catch (e) {
        debugMessage(`Command: ${gameName}_pass\nIn: ${callback.message.chat.id} - ${callback.message.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];