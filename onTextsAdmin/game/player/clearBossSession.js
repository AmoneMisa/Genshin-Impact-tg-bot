const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const {myId} = require("../../../config");
const data = require("../../../data");

module.exports = [[/(?:^|\s)\/clear_boss_sessions\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    for (let [chatId, chatSession] of Object.entries(data.sessions)) {
        if (Object.values(chatSession.members).length !== 1) {
            continue;
        }

        if (chatId !== Object.keys(chatSession.members)[0]) {
            continue;
        }

        delete data.bosses[chatId];
        delete chatSession.boss;
    }

    for (let bossChatId of Object.keys(data.bosses)) {
        if (data.sessions[bossChatId]) {
            continue;
        }

        delete data.bosses[bossChatId];
    }

    await sendMessage(myId, "Все чат сессии очищены. Убедиться в результате можно по команде /get_file bosses.json");
}]];