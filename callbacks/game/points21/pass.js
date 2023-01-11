const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');
const getChatSession = require('../../../functions/getters/getChatSession');
const validatePointSession = require('../../../functions/game/point21/validatePointSession');
const checkAllPlayersPassed = require('../../../functions/game/point21/checkAllPlayersPassed');
const endGame = require('../../../functions/game/point21/endGame');
const endGameTimer = require('../../../functions/game/point21/endGameTimer');
const getUserName = require('../../../functions/getters/getUserName');

module.exports = [["points_pass", async (session, callback) => {
    try {
        let chatSession = getChatSession(callback.message.chat.id);
        let userId = callback.from.id;

        if (!validatePointSession(chatSession, userId)) {
            return;
        }

        endGameTimer(chatSession, 20 * 1000, callback.message.chat.id);

        chatSession.pointPlayers[userId].isPass = true;

        if (checkAllPlayersPassed(chatSession)) {
            endGame(chatSession, callback.message.chat.id, callback.message.message_id);
            return;
        }

        sendMessage(callback.message.chat.id, `${getUserName(session, "nickname")}, ты спасовал. Больше брать карты и повышать ставку нельзя`)
            .then(message => {
                deleteMessageTimeout(callback.message.chat.id, message.message_id, 7000);
            });

    } catch (e) {
        debugMessage(`Command: points_pass\nIn: ${callback.message.chat.id} - ${callback.message.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];