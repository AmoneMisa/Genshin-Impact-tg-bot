import sendMessage from './sendMessage.js';
import retryBotRequest from './retryBotRequest.js';

export default function (chatId, text, form, timestamp) {
    if (timestamp <= new Date().getTime()) {
        return;
    }

    setTimeout(() => retryBotRequest(bot => sendMessage(chatId, text, form)),  Math.max(0, timestamp - new Date().getTime()));
};