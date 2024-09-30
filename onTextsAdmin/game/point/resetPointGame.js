import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getChatSession from '../../../functions/getters/getChatSession.js';
import getMemberStatus from '../../../functions/getters/getMemberStatus.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/reset_point_game\b/, (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);

    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let chatSession = getChatSession(msg.chat.id);
    chatSession.game.points.isStart = false;
    chatSession.game.points.gameSessionIsStart = false;
    chatSession.game.points.players = {};
    chatSession.game.points.usedItems = [];

    return sendMessage(msg.chat.id, `Сессия игры в очко сброшена.`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
    });
}]];