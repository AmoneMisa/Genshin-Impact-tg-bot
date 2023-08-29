const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const {myId} = require("../../../config");
const updatePlayerSkills = require("../../../functions/game/player/updatePlayerSkills");
const data = require("../../../data");

module.exports = [[/(?:^|\s)\/update_all_players_skills\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    for (let chatSession of Object.values(data.sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            updatePlayerSkills(session);
        }
    }
    return sendMessage(myId, "Все скиллы сессий обновлены. Убедиться в результате можно по команде /get_file sessions.json");
}]];