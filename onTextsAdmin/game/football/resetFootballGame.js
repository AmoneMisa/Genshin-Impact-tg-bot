import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import endGame from '../../../functions/game/football/endGame.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/reset_football_game\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    await endGame(msg.chat.id, msg.from.id);

    await sendMessageWithDelete(msg.chat.id, `Сессия игры в футбол сброшена.`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
    }, 3000);
}]];