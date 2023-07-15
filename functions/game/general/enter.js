const getChatSession = require("../../getters/getChatSession");
const getMembers = require("../../getters/getMembers");
const bot = require("../../../bot");
const gameStatusMessage = require("../point21/gameStatusMessage");
const debugMessage = require("../../tgBotFunctions/debugMessage");

module.exports = function (session, callback, gameName) {
    try {
        let chatSession = getChatSession(callback.message.chat.id);
        let userId = callback.from.id;
        let players = chatSession.game[gameName].players;
        let player = players[userId];

        if (!player) {
            players[userId] = {
                bet: 0,
                items: [],
                isPass: false
            };
        } else {
            return ;
        }

        let members = getMembers(callback.message.chat.id);

        bot.editMessageText(`${gameStatusMessage(chatSession, members)}`, {
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

    } catch (e) {
        debugMessage(`Command: ${gameName}_enter\nIn: ${callback.message.chat.id} - ${callback.message.chat.title}\n\nError: ${e}`);
        throw e;
    }
}