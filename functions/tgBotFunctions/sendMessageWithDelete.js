import sendMessage from './sendMessage.js';
import retryBotRequest from './retryBotRequest.js';

export default async function (chatId, text, form, timeout) {
    let message = await sendMessage(chatId, text, form);
    setTimeout(() => retryBotRequest(bot => bot.deleteMessage(message.chat.id, message.message_id)), timeout);
};