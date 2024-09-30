import getWinners from './getWinners.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import sendMessageWithDelete from '../../tgBotFunctions/sendMessageWithDelete.js';

export default function (winners, chatId, messageId, isDefault = true, gameName) {
    if (isDefault) {
        deleteMessage(chatId, messageId);
    }

    return sendMessageWithDelete(chatId, getWinners(winners, gameName), {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
    }, 60 * 1000);
};