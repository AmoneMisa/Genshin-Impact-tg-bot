const getBossesByChatId = require("./getBossesByChatId");

module.exports = function (chatId, bossName) {
    let chatBosses = getBossesByChatId(chatId);
    return chatBosses.find(boss => boss.name === bossName);
}