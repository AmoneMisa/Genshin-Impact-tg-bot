import retryBotRequest from './retryBotRequest.js';

export default function (chatId, text, form) {
    console.log("sendMessage", chatId, text);
    return retryBotRequest(bot => bot.sendMessage(chatId, text, form));
};