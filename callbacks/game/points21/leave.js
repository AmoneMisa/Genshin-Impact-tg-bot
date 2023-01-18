const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const getChatSession = require('../../../functions/getters/getChatSession');
const gameStatusMessage = require('../../../functions/game/point21/gameStatusMessage');
const bot = require('../../../bot');
const getMembers = require('../../../functions/getters/getMembers');

module.exports = [["points_leave", async (session, callback) => {
    try {
        let chatSession = getChatSession(callback.message.chat.id);
        let userId = callback.from.id;

        if (!chatSession.hasOwnProperty("pointPlayers")) {
            chatSession.pointPlayers = {};
            return;
        }

        if (chatSession.pointPlayers[userId]) {
            delete chatSession.pointPlayers[userId];
        } else {
            return ;
        }

        let members = getMembers(callback.message.chat.id);

        bot.editMessageText(`${gameStatusMessage(chatSession, members)}`, {
            chat_id: callback.message.chat.id,
            message_id: chatSession.pointMessageId,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Участвовать",
                    callback_data: "points_enter"
                }], [{
                    text: "Покинуть игру",
                    callback_data: "points_leave"
                }]]
            }
        });

    } catch (e) {
        debugMessage(`Command: points_leave\nIn: ${callback.message.chat.id} - ${callback.message.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];