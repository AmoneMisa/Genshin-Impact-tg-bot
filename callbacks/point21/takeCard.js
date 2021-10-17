const bot = require('../../bot');
const {myId} = require('../../config');
const sendMessage = require('../../functions/sendMessage');
const getChatSession = require('../../functions/getChatSession');
const pointMessage = require('../../functions/point21/pointMessage');
const validatePointSession = require('../../functions/point21/validatePointSession');
const checkAllPlayersPassed = require('../../functions/point21/checkAllPlayersPassed');
const getWinners = require('../../functions/point21/getWinners');
const deleteMessageTimeout = require('../../functions/deleteMessageTimeout');
const getCard = require('../../functions/point21/getCard');
const getPoints = require('../../functions/point21/getPoints');

module.exports = [["points_card", function (session, callback) {
    try {
        let chatSession = getChatSession(callback.message.chat.id);
        let userId = session.userChatData.user.id;

        if (!validatePointSession(chatSession, userId)) {
            return;
        }

        getCard(chatSession, userId);

        let player = chatSession.pointPlayers[userId];
        let points = getPoints(player);

        if (points >= 21) {
            player.isPass = true;
        }

        if (checkAllPlayersPassed(chatSession)) {
            chatSession.pointIsStart = false;
            bot.deleteMessage(callback.message.chat.id, callback.message.message_id);
            sendMessage(callback.message.chat.id, getWinners(chatSession))
                .then(message => {
                    deleteMessageTimeout(callback.message.chat.id, message.message_id, 15 * 1000);
                });
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
        console.error(e);
        sendMessage(myId, `Command: points_card\nIn: ${callback.message.chat.id} - ${callback.message.chat.title}\n\nError: ${e}`);
    }
}]];