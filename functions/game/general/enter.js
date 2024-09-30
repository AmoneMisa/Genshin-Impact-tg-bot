import getChatSession from '../../getters/getChatSession.js';
import getMembers from '../../getters/getMembers.js';
import gameStatusMessage from './gameStatusMessage.js';
import editMessageText from '../../tgBotFunctions/editMessageText.js';

export default function (session, callback, gameName) {
    let chatSession = getChatSession(callback.message.chat.id);
    let userId = callback.from.id;
    let players = chatSession.game[gameName].players;
    let player = players[userId];

    if (!player) {
        if (gameName === "points") {
            players[userId] = {
                bet: 0,
                usedItems: [],
                isPass: false
            };
        } else if (gameName === "elements") {
            players[userId] = {
                bet: 0,
                usedItems: [],
                points: 0,
                id: userId
            };
        }
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