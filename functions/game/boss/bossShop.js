const shopTemplate = require('../../../templates/shopTemplate');
const sendMessage = require('../../tgBotFunctions/sendMessage');
const getUserName = require('../../getters/getUserName');

module.exports = function (chatId, session) {
    let str = "";

    for (let item of shopTemplate) {
        str += `${item.name} - ${item.cost} золота - доступно ${item.time} раз. Команда для покупки: /buy_${item.command}\n\n`;
    }

    return sendMessage(chatId, `@${getUserName(session, "nickname")}, выбери команду для покупки в магазине.\nВсе товары доступны раз в неделю. Таймер обновляется в 00.00 понедельника.\nСписок товаров:\n${str}`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
};