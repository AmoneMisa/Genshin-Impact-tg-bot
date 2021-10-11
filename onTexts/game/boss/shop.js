const bot = require('../../../bot');
const {myId} = require('../../../config');
const {sessions} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const bossShop = require('../../../functions/boss/bossShop');
const getSession = require('../../../functions/getSession');

module.exports = [[/(?:^|\s)\/boss_shop\b/, async (msg) => {
    try {
        let session = await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);
        bossShop(msg.chat.id, session);
    } catch (e) {
        sendMessage(myId, `Command: /boss_shop\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];