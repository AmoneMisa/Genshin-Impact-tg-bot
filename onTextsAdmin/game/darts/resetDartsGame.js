const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const endGame = require('../../../functions/game/darts/endGame');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/reset_darts_game\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    endGame(session);

    await sendMessageWithDelete(msg.chat.id, `Сессия игры в дартс сброшена.`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
    }, 3000);
}]];