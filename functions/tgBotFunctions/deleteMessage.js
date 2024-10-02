import retryBotRequest from './retryBotRequest.js';

export default function (chatId, msg) {
    if (!msg) {
        return;
    }
    console.log("deleteMessage", chatId, msg);

    return retryBotRequest(bot => bot.deleteMessage(chatId, msg));
};