const bot = require('../../../bot');
const sendMessage = require('../../../functions/sendMessage');
const getChatSession = require('../../../functions/getChatSession');
const getMemberStatus = require("../../../functions/getMemberStatus");

module.exports = [[/(?:^|\s)\/reset_point_game\b/, (msg) => {
    bot.deleteMessage(msg.chat.id, msg.message_id);

    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let chatSession = getChatSession(msg.chat.id);
    chatSession.pointIsStart = false;
    chatSession.pointGameSessionIsStart = false;
    chatSession.pointPlayers = {};
    chatSession.pointUsedCards = [];

    sendMessage(msg.chat.id, `Сессия игры в очко сброшена.`);
}]];