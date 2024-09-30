import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import endGame from '../../../functions/game/basketball/endGame.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/reset_basketball_game\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    endGame(session);

    await sendMessageWithDelete(msg.chat.id, `Сессия игры в баскетбол сброшена.`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
    }, 3000);
}]];