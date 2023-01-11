const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const getChatSession = require('../../../functions/getters/getChatSession');
const getMembers = require('../../../functions/getters/getMembers');
const gameStatusMessage = require('../../../functions/game/point21/gameStatusMessage');
const bot = require('../../../bot');

module.exports = [["points_enter", async (session, callback) => {
    try {
        let chatSession = getChatSession(callback.message.chat.id);
        let userId = callback.from.id;

        if (!chatSession.pointPlayers[userId]) {
            chatSession.pointPlayers[userId] = {
                bet: 0,
                cards: [],
                isPass: false
            };
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
        debugMessage(`Command: points_enter\nIn: ${callback.message.chat.id} - ${callback.message.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];