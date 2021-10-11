const bot = require('../../../bot');
const {myId} = require('../../../config');
const {sessions} = require('../../../data');
const sendMessage = require('../../../functions/sendMessage');
const bossShopSellItem = require('../../../functions/boss/bossShopSellItem');
const getSession = require('../../../functions/getSession');
const buttonsDictionary = require('../../../dictionaries/buttons');

module.exports = [[/(?:^|\s)\/buy_(.*?)\b/, async (msg, regResult) => {
    try {
        let regResultStr = regResult[1];
        let session = await getSession(sessions, msg.chat.id, msg.from.id);
        bot.deleteMessage(msg.chat.id, msg.message_id);
        sendMessage(msg.chat.id, bossShopSellItem(session, regResultStr), {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });

    } catch (e) {
        sendMessage(myId, `Command: /buy_${regResult[1]}\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];