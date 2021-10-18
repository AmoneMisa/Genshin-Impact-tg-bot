const bot = require('../../../bot');
const sendMessage = require('../../../functions/sendMessage');
const debugMessage = require('../../../functions/debugMessage');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const getChatSession = require('../../../functions/getChatSession');
const validatePointSession = require('../../../functions/game/point21/validatePointSession');
const getWinners = require('../../../functions/game/point21/getWinners');
const checkAllPlayersPassed = require('../../../functions/game/point21/checkAllPlayersPassed');

module.exports = [["points_pass", async (session, callback) => {
    try {
        let chatSession = getChatSession(callback.message.chat.id);
        let userId = callback.from.id;

        if (!validatePointSession(chatSession, userId)) {
            return;
        }

        chatSession.pointPlayers[userId].isPass = true;

        if (checkAllPlayersPassed(chatSession)) {
            chatSession.pointIsStart = false;
            bot.deleteMessage(callback.message.chat.id, callback.message.message_id);
            sendMessage(callback.message.chat.id, getWinners(chatSession))
                .then(message => {
                    deleteMessageTimeout(callback.message.chat.id, message.message_id, 15 * 1000);
                });
            return;
        }

        sendMessage(callback.message.chat.id, `${session.userChatData.user.username}, ты спасовал. Больше брать карты и повышать ставку нельзя`)
            .then(message => {
                deleteMessageTimeout(callback.message.chat.id, message.message_id, 7000);
            });

    } catch (e) {
        debugMessage(`Command: points_pass\nIn: ${callback.message.chat.id} - ${callback.message.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];