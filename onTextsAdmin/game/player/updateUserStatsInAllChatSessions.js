const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const {myId} = require("../../../config");
const updatePlayerStats = require("../../../functions/game/player/updatePlayerStats");
const data = require("../../../data");

module.exports = [[/(?:^|\s)\/update_all_players_characteristic\b/, async (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    for (let chatSession of Object.values(data.sessions)) {
        for (let session of Object.values(chatSession.members)) {
            updatePlayerStats(session);
        }
    }
    return sendMessage(myId, "Все сессии обновлены. Убедиться в результате можно по команде /get_file sessions.json");
}]];