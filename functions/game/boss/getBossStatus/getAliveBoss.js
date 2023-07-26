const bossAlreadySummoned = require("./bossAlreadySummoned");
const getBossesByChatId = require("../getters/getBossesByChatId");

module.exports = function (chatId) {
    let chatBosses = getBossesByChatId(chatId);
    if (!Array.isArray(chatBosses)) {
        return ;
    }

    return chatBosses.find(bossAlreadySummoned);
}