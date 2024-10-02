import sendMessage from './sendMessage.js';
import retryBotRequest from './retryBotRequest.js';

export default async function (chatId, text, form, timeout) {
    let message = await sendMessage(chatId, text, form);
    console.log("sendMessageWithDelete", chatId, text);

    setTimeout(() => retryBotRequest(bot => bot.deleteMessage(message.chat.id, message.message_id)), timeout);
};