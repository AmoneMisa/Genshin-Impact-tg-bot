import endGame from './endGame.js';
import sendMessageWithDelete from '../../tgBotFunctions/sendMessageWithDelete.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import setEndGameTimer from './setEndGameTimer.js';

const messagesMap = {
    points: "очко",
    elements: "элементы"
}

export default function (chatSession, timer, chatId, gameName) {
    setEndGameTimer(chatSession, timer, chatId, gameName, () => {
        endGame(chatSession, chatId, null, false, gameName);
        sendMessageWithDelete(chatId, `Игра в ${messagesMap[gameName]} была отменена из-за отсутствия активности участников. Начните новую игру.`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 7000);
        return deleteMessage(chatId, chatSession.game[gameName].messageId);
    })
};