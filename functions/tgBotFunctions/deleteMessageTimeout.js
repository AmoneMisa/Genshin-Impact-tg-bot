import deleteMessage from './deleteMessage.js';

export default function (chatId, msg, milliseconds) {
    if (!msg) {
        return;
    }

    setTimeout(() => deleteMessage(chatId, msg), milliseconds);
};