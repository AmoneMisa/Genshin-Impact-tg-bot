const {myId} = require('../../../config');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getSession = require('../../../functions/getters/getSession');
const resetSwordTimer = require('../../../functions/game/sword/resetSwordTimer');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/reset_sword_timer\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }
    await getSession(msg.chat.id, msg.from.id);
    await deleteMessage(msg.chat.id, msg.message_id);
    await resetSwordTimer();
    return sendMessage(myId, "Сессии сброшены.");
}]];