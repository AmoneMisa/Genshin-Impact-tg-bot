import sendMessageWithDelete from '../../tgBotFunctions/sendMessageWithDelete.js';
import getUserName from '../../getters/getUserName.js';

export default function (callback, session, item, message) {
    return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(session, "nickname")}, ты получил(-а) ${item} ${message}`, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
    }, 10 * 1000);
};