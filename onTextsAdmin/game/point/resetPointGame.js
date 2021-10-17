const {myId, friendId} = require('../../../config');
const sendMessage = require('../../../functions/sendMessage');
const getChatSession = require('../../../functions/getChatSession');

module.exports = [[/(?:^|\s)\/reset_point_game\b/, (msg) => {
    if (msg.from.id !== myId || msg.from.id !== friendId) {
        return;
    }

    let chatSession = getChatSession(msg.chat.id);
    chatSession.pointIsStart = false;
    chatSession.pointPlayers = {};
    chatSession.pointUsedCards = [];

    sendMessage(msg.chat.id, `Сессия игры сброшена.`);
}]];