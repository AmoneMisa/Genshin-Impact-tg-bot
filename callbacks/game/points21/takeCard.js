const bot = require('../../../bot');
const debugMessage = require('../../../functions/debugMessage');
const getChatSession = require('../../../functions/getChatSession');
const pointMessage = require('../../../functions/game/point21/pointMessage');
const validatePointSession = require('../../../functions/game/point21/validatePointSession');
const checkAllPlayersPassed = require('../../../functions/game/point21/checkAllPlayersPassed');
const getCard = require('../../../functions/game/point21/getCard');
const getPoints = require('../../../functions/game/point21/getPoints');
const endGame = require('../../../functions/game/point21/endGame');
const endGameMessage = require('../../../functions/game/point21/endGameMessage');
const endGameTimer = require('../../../functions/game/point21/endGameTimer');

module.exports = [["points_card", function (session, callback) {
    try {
        let chatSession = getChatSession(callback.message.chat.id);
        let userId = session.userChatData.user.id;

        if (!validatePointSession(chatSession, userId)) {
            return;
        }

        getCard(chatSession, userId);
        chatSession.pointGameSessionLastUpdateAt = new Date().getTime();

        let player = chatSession.pointPlayers[userId];
        let points = getPoints(player);

        if (points >= 21) {
            player.isPass = true;
        }

        if (checkAllPlayersPassed(chatSession)) {
            endGame(chatSession, callback);
            return;
        }

        bot.editMessageText(pointMessage(chatSession, userId), {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Взять карту",
                    callback_data: "points_card"
                }, {
                    text: "Пас",
                    callback_data: "points_pass"
                }]]
            }
        });
    } catch (e) {
        debugMessage(`Command: points_card\nIn: ${callback.message.chat.id} - ${callback.message.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];