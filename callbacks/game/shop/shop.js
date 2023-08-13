const editMessageCaption = require("../../../functions/tgBotFunctions/editMessageCaption");
const shopTemplate = require('../../../templates/shopTemplate');
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const getUserName = require("../../../functions/getters/getUserName");
const controlButtons = require("../../../functions/keyboard/controlButtons");
const shopSellItem = require("../../../functions/game/shop/shopSellItem");

function buildKeyboard(category, isBuy) {
    let buttons = [];
    for (let item of shopTemplate) {
        if (item.category === category) {
            if (isBuy) {
                buttons.push([{
                    text: `${item.name} - ${item.cost}`,
                    callback_data: `shop.${item.category}.${item.command}.buy`
                }]);
            } else {
                buttons.push([{
                    text: `${item.name} - ${item.cost}`,
                    callback_data: `shop.${item.category}.${item.command}`
                }]);
            }
        }
    }

    return buttons;
}

const categoriesMap = {
    boss: "Всё для босса",
    player: "Всё для игрока",
    sword: "Всё для мечей",
    misc: "Разное",
    builds: "Всё для построек",
};

function buildCategoryKeyboard() {
    let buttons = [];
    for (let [key, value] of Object.entries(categoriesMap)) {
        buttons.push([{text: value, callback_data: `shop.${key}`}]);
    }

    return buttons;
}

module.exports = [["shop", async function (session, callback) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    await editMessageCaption(`@${getUserName(session, "nickname")}, выбери категорию для покупки в магазине.\nВсе товары доступны раз в неделю. Таймер обновляется в 00.00 понедельника.`, {
        chat_id: chatId,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons("shop", buildCategoryKeyboard(), 1)
        }
    }, callback.message.photo);
}], [/^shop_([^.]+)$/, async function (session, callback, [ , page]) {
    page = parseInt(page);
    let buttons = buildCategoryKeyboard();

    await editMessageCaption(`@${getUserName(session, "nickname")}, выбери категорию для покупки в магазине.\nВсе товары доступны раз в неделю. Таймер обновляется в 00.00 понедельника.`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons("shop", buttons, page)
            ]
        }
    }, callback.message.photo);
}], [/^shop\.([^._]+)$/, async function (session, callback, [ , category]) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;
    await editMessageCaption(`@${getUserName(session, "nickname")}, выбери предметы для покупки в магазине.`, {
        chat_id: chatId,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`shop.${category}`, buildKeyboard(category, true), 1, "shop")
        }
    }, callback.message.photo);
}], [/^shop\.([^.0-9]+)_(\d+)$/, async function (session, callback, [, category, page]) {
    page = parseInt(page);

    await editMessageCaption(`@${getUserName(session, "nickname")}, выбери предмет для покупки в магазине.`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`shop.${category}`, buildKeyboard(category, true), page, "shop")
            ]
        }
    }, callback.message.photo);
}], [/^shop\.([^.]+)\.([^.]+)\.buy$/, async function (session, callback, [, category, itemName]) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;
    let item = shopTemplate.filter(_item => _item.command === itemName);
    item = item[0];

    if (session.game.inventory.gold < item.cost) {
        return sendMessageWithDelete(chatId, `"@${getUserName(session, "nickname")},недостаточно золота."`, {});
    }

    await editMessageCaption(`@${getUserName(session, "nickname")}, ты уверен, что хочешь купить ${item.name}?.\nСтоимость: ${item.cost} золота.`, {
        chat_id: chatId,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Купить",
                callback_data: `shop.${category}.${itemName}.buy.0`
            }], [{
                text: categoriesMap[category], callback_data: `shop.${category}`
            }, {
                text: "Главная", callback_data: "shop"
            }], [{
                text: "Закрыть", callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^shop\.[^.]+\.([^.]+)\.buy\.0$/, async function (session, callback, [, itemName]) {
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let item = shopTemplate.filter(_item => _item.command === itemName);
    item = item[0];

    let sellItem = shopSellItem(session, item.command, item);
    if (typeof sellItem === "string") {
        return sendMessageWithDelete(chatId, sellItem, {}, 10 * 1000);
    }

    await editMessageCaption(`@${getUserName(session, "nickname")}, поздравляем с покупкой ${item.name}!`, {
        chat_id: chatId,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons("shop", buildCategoryKeyboard(), 1)
        }
    }, callback.message.photo);
}]];