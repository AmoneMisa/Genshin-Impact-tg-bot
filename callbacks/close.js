import deleteMessage from '../functions/tgBotFunctions/deleteMessage.js';

export default [["close", async function (session, callback) {
    await deleteMessage(callback.message.chat.id, callback.message.message_id)
}]];