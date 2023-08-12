const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const {myId} = require("../../../config");
const getSession = require("../../../functions/getters/getSession");
const getMaxHp = require("../../../functions/game/player/getters/getMaxHp");

module.exports = [[/(?:^|\s)\/respawn\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (msg.from.id !== myId) {
        return;
    }

    let session = await getSession(msg.chat.id, myId);
    session.game.gameClass.stats.hp = getMaxHp(session, session.game.gameClass);

    await sendMessage(msg.from.id, "Ты воскрес", { disable_notification: true});
}]];