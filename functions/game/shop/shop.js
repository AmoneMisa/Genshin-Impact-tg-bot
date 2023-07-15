const sendMessage = require('../../tgBotFunctions/sendMessage');
const getUserName = require('../../getters/getUserName');
const controlButtons = require('../../keyboard/controlButtons');

const categoriesMap = {
    boss: "Всё для босса",
    player: "Всё для игрока",
    sword: "Всё для мечей",
    misc: "Разное",
    builds: "Всё для построек",
};

function buildKeyboard() {
    let buttons = [];
    for (let [key, value] of Object.entries(categoriesMap)) {
        buttons.push([{text: value, callback_data: `shop.${key}`}]);
    }

    return buttons;
}

module.exports = function (chatId, session) {
    return sendMessage(chatId, `@${getUserName(session, "nickname")}, выбери категорию для покупки в магазине.\nВсе товары доступны раз в неделю. Таймер обновляется в 00.00 понедельника.`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons("shop", buildKeyboard(), 1)
        }
    });
};