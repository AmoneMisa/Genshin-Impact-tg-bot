const bot = require('../../../bot');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const shop = require('../../../functions/game/shop/shop');

module.exports = [[/(?:^|\s)\/shop\b/, async (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        await shop(msg.chat.id, session);
    } catch (e) {
        debugMessage(`Command: /shop\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];