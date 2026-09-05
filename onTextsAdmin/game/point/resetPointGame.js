import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getChatSession from '../../../functions/getters/getChatSession.js';
import getMemberStatus from '../../../functions/getters/getMemberStatus.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/reset_point_game\b/, async (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);

    if (!await getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let chatSession = await getChatSession(msg.chat.id);
    chatSession.game.points.isStart = false;
    chatSession.game.points.gameSessionIsStart = false;
    chatSession.game.points.players = {};
    chatSession.game.points.usedItems = [];
    await chatSession.save();

    return sendMessage(msg.chat.id, `Сессия игры в очко сброшена.`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
    });
}]];