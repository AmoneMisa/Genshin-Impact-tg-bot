import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import endGame from '../../../functions/game/darts/endGame.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/reset_darts_game\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    await endGame(msg.chat.id, msg.from.id);

    await sendMessageWithDelete(msg.chat.id, `Сессия игры в дартс сброшена.`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
    }, 3000);
}]];