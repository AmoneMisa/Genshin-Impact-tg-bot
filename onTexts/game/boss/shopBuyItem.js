const bot = require('../../../bot');
const {myId} = require('../../../config');
const sendMessage = require('../../../functions/sendMessage');
const bossShopSellItem = require('../../../functions/game/boss/bossShopSellItem');
const buttonsDictionary = require('../../../dictionaries/buttons');

module.exports = [[/(?:^|\s)\/buy_(.*?)\b/, async (msg, regResult, session) => {
    try {
        let regResultStr = regResult[1];
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