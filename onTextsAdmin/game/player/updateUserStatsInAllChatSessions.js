const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const {myId} = require("../../../config");
const updatePlayerStats = require("../../../functions/game/player/updatePlayerStats");
const data = require("../../../data");
const setLevel = require("../../../functions/game/player/setLevel");

module.exports = [[/(?:^|\s)\/update_all_players_characteristic\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    for (let chatSession of Object.values(data.sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            updatePlayerStats(session);
            setLevel(session);
        }
    }
    return sendMessage(myId, "Все сессии обновлены. Убедиться в результате можно по команде /get_file sessions.json");
}]];