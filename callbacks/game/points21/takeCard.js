import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import getChatSession from '../../../functions/getters/getChatSession.js';
import pointMessage from '../../../functions/game/point21/pointMessage.js';
import validateGameSession from '../../../functions/game/general/validateGameSession.js';
import checkAllPlayersPassed from '../../../functions/game/general/checkAllPlayersPassed.js';
import getCard from '../../../functions/game/point21/getCard.js';
import getPoints from '../../../functions/game/point21/getPoints.js';
import endGame from '../../../functions/game/general/endGame.js';
import endGameTimer from '../../../functions/game/general/endGameTimer.js';

export default [["points_card", function (session, callback) {
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
        endGame(chatSession, callback.message.chat.id, callback.message.message_id, true, "points");
        return;
    }

    editMessageText(pointMessage(chatSession, userId), {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
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
}]];