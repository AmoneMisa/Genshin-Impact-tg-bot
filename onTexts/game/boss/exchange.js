const sendMessageWithDelete = require('../../../functions/tgBotFunctions/sendMessageWithDelete');
const getUserName = require('../../../functions/getters/getUserName');
const getEmoji = require('../../../functions/getters/getEmoji');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/exchange ([0-9]+)\b/, async (msg, session, [ , amount]) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    let crystals = Math.round(parseInt(amount));

    if (session.game.inventory.gold < crystals * 1500) {
        return sendMessageWithDelete(msg.from.id, `${getUserName(session, "nickname")}, у тебя не хватает ${crystals * 1500 - session.game.inventory.gold} золота для этой покупки`, {}, 10 * 1000);
    }

    session.game.inventory.gold -= crystals * 1500;

    if (typeof session.game.inventory.crystals === "string") {
        session.game.inventory.crystals = parseInt(session.game.inventory.crystals);
    }

    session.game.inventory.crystals += crystals;

    return sendMessageWithDelete(msg.from.id, `Ты купил ${getEmoji("crystals")} ${crystals} кристаллов.`, { disable_notification: true }, 10 * 1000);
}]];