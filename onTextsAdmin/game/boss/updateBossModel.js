const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const {myId} = require("../../../config");
const updateBossModel = require("../../../functions/game/boss/updateBossModel");

module.exports = [[/(?:^|\s)\/update_boss_model\b/, async (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    updateBossModel();
    return sendMessage(myId, "Боссы обновлены. Убедиться в результате можно по команде /get_file bosses.json");
}]];