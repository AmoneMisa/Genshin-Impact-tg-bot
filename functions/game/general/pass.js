const getChatSession = require("../../getters/getChatSession");
const validateGameSession = require("./validateGameSession");
const endGameTimer = require("./endGameTimer");
const checkAllPlayersPassed = require("./checkAllPlayersPassed");
const endGame = require("./endGame");
const sendMessage = require("../../tgBotFunctions/sendMessage");
const getUserName = require("../../getters/getUserName");
const deleteMessageTimeout = require("../../tgBotFunctions/deleteMessageTimeout");

module.exports = function (session, callback, gameName) {
    let chatSession = getChatSession(callback.message.chat.id);
    let userId = callback.from.id;
    if (!validateGameSession(chatSession.game.points, userId, gameName)) {
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
    return sendMessage(callback.message.chat.id, `${getUserName(session, "nickname")}, ты спасовал. Больше что-либо делать в течении игры нельзя.`, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
    })
        .then(message => {
            deleteMessageTimeout(callback.message.chat.id, message.message_id, 7000);
        });
}