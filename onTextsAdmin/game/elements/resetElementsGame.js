import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getChatSession from '../../../functions/getters/getChatSession.js';
import getMemberStatus from '../../../functions/getters/getMemberStatus.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/reset_elements_game\b/, (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);

    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let chatSession = getChatSession(msg.chat.id);
    chatSession.game.elements.gameSessionIsStart = false;
    chatSession.game.elements.players = {};
    chatSession.game.elements.usedItems = [];
    chatSession.game.elements.currentRound = 1;
    chatSession.game.elements.countPresses = 0;

    return sendMessage(msg.chat.id, `Сессия игры в элементы сброшена.`, {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
    });
}]];