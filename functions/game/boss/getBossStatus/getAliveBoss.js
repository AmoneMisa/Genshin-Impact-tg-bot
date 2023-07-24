const bossAlreadySummoned = require("./bossAlreadySummoned");
const getBossesByChatId = require("../getters/getBossesByChatId");

module.exports = function (chatId) {
    let chatBosses = getBossesByChatId(chatId);
    return chatBosses.find(bossAlreadySummoned);
}