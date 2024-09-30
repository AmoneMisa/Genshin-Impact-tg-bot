import retryBotRequest from './retryBotRequest.js';

export default function (text, form) {
    if (!form.chat_id || !form.message_id) {
        return;
    }

    return retryBotRequest(bot => bot.editMessageText(text, form));
};