import retryBotRequest from './retryBotRequest.js';

export default function (chatId, text, form) {
    return retryBotRequest(bot => bot.sendMessage(chatId, text, form));
};