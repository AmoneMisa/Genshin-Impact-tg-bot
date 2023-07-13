const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const getChatSession = require('../../../functions/getters/getChatSession');
const gameStatusMessage = require('../../../functions/game/point21/gameStatusMessage');
const bot = require('../../../bot');
const getMembers = require('../../../functions/getters/getMembers');

module.exports = [[/[^\b_]+_leave$/, async (session, callback) => {
    const [, gameName] = callback.data.match(/([^\b]+)_leave$/);

    try {
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
        debugMessage(`Command: ${gameName}_leave\nIn: ${callback.message.chat.id} - ${callback.message.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];