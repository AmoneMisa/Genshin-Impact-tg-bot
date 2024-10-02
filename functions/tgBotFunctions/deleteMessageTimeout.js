import deleteMessage from './deleteMessage.js';

export default function (chatId, msg, milliseconds) {
    if (!msg) {
        return;
    }
    console.log("deleteMessageTimeout", chatId, msg);

    setTimeout(() => deleteMessage(chatId, msg), milliseconds);
};