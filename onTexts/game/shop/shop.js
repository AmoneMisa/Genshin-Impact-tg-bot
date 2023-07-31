const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const sendPhoto = require("../../../functions/tgBotFunctions/sendPhoto");
const getUserName = require("../../../functions/getters/getUserName");
const getFile = require("../../../functions/getters/getFile");
const controlButtons = require("../../../functions/keyboard/controlButtons");
const fs = require("fs");

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

module.exports = [[/(?:^|\s)\/shop\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    const file = getFile( "images/misc", "shop");

    if (file) {
        await sendPhoto(msg.chat.id, file, {
            caption: `@${getUserName(session, "nickname")}, выбери категорию для покупки в магазине.\nВсе товары доступны раз в неделю. Таймер обновляется в 00.00 понедельника.`,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: controlButtons("shop", buildKeyboard(), 1)
            }
        });
    } else {
        await sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, выбери категорию для покупки в магазине.\nВсе товары доступны раз в неделю. Таймер обновляется в 00.00 понедельника.`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: controlButtons("shop", buildKeyboard(), 1)
            }
        });
    }
}]];