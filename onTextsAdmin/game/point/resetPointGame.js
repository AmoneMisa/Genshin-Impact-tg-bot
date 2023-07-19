const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getChatSession = require('../../../functions/getters/getChatSession');
const getMemberStatus = require("../../../functions/getters/getMemberStatus");
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/reset_point_game\b/, (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);

    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let chatSession = getChatSession(msg.chat.id);
    chatSession.game.points.isStart = false;
    chatSession.game.points.gameSessionIsStart = false;
    chatSession.game.points.players = {};
    chatSession.game.points.usedItems = [];

    sendMessage(msg.chat.id, `Сессия игры в очко сброшена.`);
}]];