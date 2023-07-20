const shop = require('../../../functions/game/shop/shop');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/shop\b/, async (msg, session) => {
        await deleteMessage(msg.chat.id, msg.message_id);
        return shop(msg.chat.id, session);
}]];