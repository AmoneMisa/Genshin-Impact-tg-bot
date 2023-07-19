const bot = require('../../../bot');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getChatSession = require('../../../functions/getters/getChatSession');
const getMemberStatus = require("../../../functions/getters/getMemberStatus");
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/reset_elements_game\b/, (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);

    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let chatSession = getChatSession(msg.chat.id);
    chatSession.game.elements.isStart = false;
    chatSession.game.elements.gameSessionIsStart = false;
    chatSession.game.elements.players = {};
    chatSession.game.elements.usedItems = [];
    chatSession.game.elements.currentRound = 1;
    chatSession.game.elements.countPresses = 0;

    sendMessage(msg.chat.id, `Сессия игры в элементы сброшена.`);
}]];