import retryBotRequest from './retryBotRequest.js';

export default function (chatId, msg) {
    if (!msg) {
        return;
    }

    try {
        return retryBotRequest(bot => bot.deleteMessage(chatId, msg));
    } catch (e) {
        throw new Error(`Error while try to delete message: ${e}`);
    }
};