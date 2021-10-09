const shopTemplate = require('../../templates/shopTemplate');
const sendMessage = require('../sendMessage');

module.exports = function (chatId, session) {
    let str = "";
    let keyboard = [];
    let tempArray = null;
    let i = 0;

    for (let item of shopTemplate) {
        str += `${item.name} - ${item.cost} золота - доступно ${item.time} раз\n`;
        if (i % 3 === 0) {
            tempArray = [];
            keyboard.push(tempArray);
        }
        tempArray.push(`/buy_${item.command}`);
        i++;
    }

    return sendMessage(chatId, `@${session.userChatData.user.username}, выбери команду для покупки в магазине.\n Все товары доступны раз в неделю. Таймер обновляется в 00.00 понедельника.\nСписок товаров:\n${str}`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            keyboard: keyboard
        }
    });
};