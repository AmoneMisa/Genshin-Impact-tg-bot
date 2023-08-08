const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const {myId} = require("../../../config");
const clearSession = require("../../../functions/misc/clearSession");
const data = require("../../../data");

module.exports = [[/(?:^|\s)\/clear_all_sessions\b/, async (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    for (let chatSession of Object.values(data.sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            clearSession(session);
        }
    }
    return sendMessage(myId, "Все сессии очищены. Убедиться в результате можно по команде /get_file sessions.json");
}]];