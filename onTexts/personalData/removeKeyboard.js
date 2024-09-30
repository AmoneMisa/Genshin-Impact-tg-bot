import sendMessageWithDelete from '../../functions/tgBotFunctions/sendMessageWithDelete.js';
import deleteMessage from '../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/remove_keyboard/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    await sendMessageWithDelete(msg.chat.id, "Клавиатура убрана.", {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        reply_markup: JSON.stringify({
            remove_keyboard: true
        })
    }, 5 * 1000)
}]];