const bot = require('../../../bot');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const getChatSession = require('../../../functions/getters/getChatSession');
const pointMessage = require('../../../functions/game/point21/pointMessage');
const validateGameSession = require('../../../functions/game/general/validateGameSession');
const checkAllPlayersPassed = require('../../../functions/game/general/checkAllPlayersPassed');
const getCard = require('../../../functions/game/point21/getCard');
const getPoints = require('../../../functions/game/point21/getPoints');
const endGame = require('../../../functions/game/general/endGame');
const endGameTimer = require('../../../functions/game/general/endGameTimer');

module.exports = [["points_card", function (session, callback) {
    try {
        let chatSession = getChatSession(callback.message.chat.id);
        let userId = session.userChatData.user.id;

        if (!validateGameSession(chatSession.game.points, userId, "points")) {
            return;
        }

        endGameTimer(chatSession, 20 * 1000, callback.message.chat.id, "points");

        getCard(chatSession.game.points, userId);
        chatSession.game.points.gameSessionLastUpdateAt = new Date().getTime();

        let player = chatSession.game.points.players[userId];
        let points = getPoints(player);

        if (points >= 21) {
            player.isPass = true;
        }

        if (checkAllPlayersPassed(chatSession, "points")) {
            endGame(chatSession, callback.message.chat.id, callback.message.message_id, true,"points");
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