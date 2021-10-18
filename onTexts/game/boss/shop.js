const bot = require('../../../bot');
const debugMessage = require('../../../functions/debugMessage');

const bossShop = require('../../../functions/game/boss/bossShop');

module.exports = [[/(?:^|\s)\/boss_shop\b/, async (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        bossShop(msg.chat.id, session);
    } catch (e) {
        debugMessage(`Command: /boss_shop\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];