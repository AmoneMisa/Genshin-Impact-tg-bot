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
    chatSession.game ||= {};
    // Text-bot session.
    if (chatSession.game.points) {
        chatSession.game.points.isStart = false;
        chatSession.game.points.gameSessionIsStart = false;
        chatSession.game.points.players = {};
        chatSession.game.points.usedItems = [];
    }
    // Mini App table (miniapp/point21.js). Bets are settled only at the end of a round,
    // so clearing an unfinished table never takes anyone's gold.
    delete chatSession.game.pointsMiniApp;
    await chatSession.save();

    return sendMessage(msg.chat.id, `Сессия игры в очко сброшена (в чате и в Mini App).`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
    });
}]];
