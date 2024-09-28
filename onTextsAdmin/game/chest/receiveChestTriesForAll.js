const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const {myId} = require("../../../config");
const getSession = require("../../../functions/getters/getSession");
const restoreChestChances = require("../../../functions/shedullers/restoreChestChances");

module.exports = [[/(?:^|\s)\/receive_all_chest\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    await getSession(msg.chat.id, msg.from.id);
    await deleteMessage(msg.chat.id, msg.message_id);
    await restoreChestChances();
    await sendMessage(myId, "Сундуки обновлены сброшены.");
}]];