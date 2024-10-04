import getChatSession from '../../getters/getChatSession.js';
import validateGameSession from './validateGameSession.js';
import endGameTimer from './endGameTimer.js';
import checkAllPlayersPassed from './checkAllPlayersPassed.js';
import endGame from './endGame.js';
import sendMessage from '../../tgBotFunctions/sendMessage.js';
import getUserName from '../../getters/getUserName.js';
import deleteMessageTimeout from '../../tgBotFunctions/deleteMessageTimeout.js';

export default function (session, callback, gameName) {
    let chatSession = getChatSession(callback.message.chat.id);
    let userId = callback.from.id;
    if (!validateGameSession(chatSession.game.points, userId, gameName)) {
        return;
    }

    endGameTimer(chatSession, 20 * 1000, callback.message.chat.id, gameName, callback.message.message_thread_id);
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