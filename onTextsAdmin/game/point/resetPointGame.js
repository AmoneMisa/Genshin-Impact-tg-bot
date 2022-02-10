const bot = require('../../../bot');
const getMembers = require('../../../functions/getMembers');
const sendMessage = require('../../../functions/sendMessage');
const getChatSession = require('../../../functions/getChatSession');

module.exports = [[/(?:^|\s)\/reset_point_game\b/, (msg) => {
    bot.deleteMessage(msg.chat.id, msg.message_id);

    let members = getMembers(msg.chat.id);
    if (members[msg.from.id].userChatData.status !== "administrator" && members[msg.from.id].userChatData.status !== "creator") {
        return;
    }

    let chatSession = getChatSession(msg.chat.id);
    chatSession.pointIsStart = false;
    chatSession.pointGameSessionIsStart = false;
    chatSession.pointPlayers = {};
    chatSession.pointUsedCards = [];

    sendMessage(msg.chat.id, `Сессия игры в очко сброшена.`);
}]];