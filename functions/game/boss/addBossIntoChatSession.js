const getBossByName = require("./getters/getBossByName");
const getBossesByChatId = require("./getters/getBossesByChatId");

module.exports = function (chatId, boss) {
    let chatBosses = getBossesByChatId(chatId);

    if (getBossByName(chatId, boss.name)) {
        throw new Error(`Босс с таким именем: ${boss.name} уже есть в чате с айди: ${chatId}`);
    }

    chatBosses.push(boss);
}