const getChatSession = require("../../getters/getChatSession");
const getMembers = require("../../getters/getMembers");
const gameStatusMessage = require("./gameStatusMessage");
const editMessageText = require("../../tgBotFunctions/editMessageText");

module.exports = function (session, callback, gameName) {
    let chatSession = getChatSession(callback.message.chat.id);
    let userId = callback.from.id;

    if (!chatSession.game[gameName].hasOwnProperty("players")) {
        chatSession.game[gameName].players = {};
        return;
    }

    let players = chatSession.game[gameName].players;
    let player = players[userId];

    if (player) {
        delete players[userId];
    } else {
        return;
    }

    let members = getMembers(callback.message.chat.id);

    return editMessageText(`${gameStatusMessage(chatSession, members, gameName)}`, {
        chat_id: callback.message.chat.id,
        message_id: chatSession.game[gameName].messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Участвовать",
                callback_data: `${gameName}_enter`
            }], [{
                text: "Покинуть игру",
                callback_data: `${gameName}_leave`
            }]]
        }
    });
}