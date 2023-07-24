const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/exchange\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    return sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, выбери, сколько кристаллов ты хочешь купить. Обмен 1 кристалл х 1500 голды.`, {
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
}]];