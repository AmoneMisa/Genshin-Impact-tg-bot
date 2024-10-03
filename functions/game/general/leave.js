import getChatSession from '../../getters/getChatSession.js';
import getMembers from '../../getters/getMembers.js';
import gameStatusMessage from './gameStatusMessage.js';
import editMessageText from '../../tgBotFunctions/editMessageText.js';

export default function (session, callback, gameName) {
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
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
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