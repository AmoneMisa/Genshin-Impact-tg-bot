const bot = require('../../../bot');
const {myId} = require('../../../config');
const sendMessage = require('../../../functions/sendMessage');
const bossShop = require('../../../functions/game/boss/bossShop');

module.exports = [[/(?:^|\s)\/boss_shop\b/, async (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        bossShop(msg.chat.id, session);
    } catch (e) {
        sendMessage(myId, `Command: /boss_shop\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];