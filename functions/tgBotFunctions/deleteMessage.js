import retryBotRequest from './retryBotRequest.js';

export default function (chatId, msg) {
    if (!msg) {
        return;
    }

    return retryBotRequest(bot => bot.deleteMessage(chatId, msg));
};