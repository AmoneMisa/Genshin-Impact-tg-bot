const bot = require('../../../bot');
const sendMessage = require('../../../functions/sendMessage');
const debugMessage = require('../../../functions/debugMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');

module.exports = [[/(?:^|\s)\/exchange\b/, async (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        sendMessage(msg.chat.id, `@${session.userChatData.user.username}, выбери, сколько кристаллов ты хочешь купить. Обмен 1 кристалл х 1500 голды.`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "50 кристаллов",
                    callback_data: "crystal_buy.50"
                }, {
                    text: "100 кристаллов",
                    callback_data: "crystal_buy.100"
                }], [{
                    text: "200 кристаллов",
                    callback_data: "crystal_buy.200"
                }, {
                    text: "500 кристаллов",
                    callback_data: "crystal_buy.500"
                }], [{
                    text: "1000 кристаллов",
                    callback_data: "crystal_buy.1000"
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });

    } catch (e) {
        debugMessage(`Command: /exchange\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];