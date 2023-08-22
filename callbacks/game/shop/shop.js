const editMessageCaption = require("../../../functions/tgBotFunctions/editMessageCaption");
const getSession = require("../../../functions/getters/getSession");
const shopTemplate = require('../../../templates/shopTemplate');
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const controlButtons = require("../../../functions/keyboard/controlButtons");
const shopSellItem = require("../../../functions/game/shop/shopSellItem");

function buildKeyboard(category, isBuy, chatId) {
    let buttons = [];
    for (let item of shopTemplate) {
        if (item.category === category) {
            if (isBuy) {
                buttons.push([{
                    text: `${item.name} - ${item.cost}`,
                    callback_data: `shop.${chatId}.${item.category}.${item.command}.buy`
                }]);
            } else {
                buttons.push([{
                    text: `${item.name} - ${item.cost}`,
                    callback_data: `shop.${chatId}.${item.category}.${item.command}`
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

function buildCategoryKeyboard(chatId) {
    let buttons = [];
    for (let [key, value] of Object.entries(categoriesMap)) {
        buttons.push([{text: value, callback_data: `shop.${chatId}.${key}`}]);
    }

    return buttons;
}

module.exports = [[/^shop\.([\-0-9]+)$/, async function (session, callback, [ , chatId]) {
    let messageId = callback.message.message_id;

    await editMessageCaption(`Выбери категорию для покупки в магазине.\nВсе товары доступны раз в неделю. Таймер обновляется в 00.00 понедельника.`, {
        chat_id: callback.message.chat.id,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`shop.${chatId}`, buildCategoryKeyboard(chatId), 1)
        }
    }, callback.message.photo);
}], [/^shop\.([\-0-9]+)_([^.]+)$/, async function (session, callback, [ , chatId, page]) {
    page = parseInt(page);
    let buttons = buildCategoryKeyboard(chatId);

    await editMessageCaption(`Выбери категорию для покупки в магазине.\nВсе товары доступны раз в неделю. Таймер обновляется в 00.00 понедельника.`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`shop.${chatId}`, buttons, page)
            ]
        }
    }, callback.message.photo);
}], [/^shop\.([\-0-9]+)\.([^._]+)$/, async function (session, callback, [ , chatId, category]) {
    let messageId = callback.message.message_id;

    await editMessageCaption(`Выбери предметы для покупки в магазине.`, {
        chat_id: callback.message.chat.id,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`shop.${chatId}.${category}`, buildKeyboard(category, true, chatId), 1, `shop.${chatId}`)
        }
    }, callback.message.photo);
}], [/^shop\.([\-0-9]+)\.([^.0-9]+)_(\d+)$/, async function (session, callback, [, chatId, category, page]) {
    page = parseInt(page);

    await editMessageCaption(`Выбери предмет для покупки в магазине.`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`shop.${chatId}.${category}`, buildKeyboard(category, true, chatId), page, `shop.${chatId}`)
            ]
        }
    }, callback.message.photo);
}], [/^shop\.([\-0-9]+)\.([^.]+)\.([^.]+)\.buy$/, async function (session, callback, [, chatId, category, itemName]) {
    let messageId = callback.message.message_id;
    let item = shopTemplate.filter(_item => _item.command === itemName);
    item = item[0];

    let foundSession = await getSession(chatId, callback.from.id);

    if (foundSession.game.inventory.gold < item.cost) {
        await sendMessageWithDelete(callback.message.chat.id, `Недостаточно золота`, {});
        return;
    }

    await editMessageCaption(`Ты уверен, что хочешь купить ${item.name}?.\nСтоимость: ${item.cost} золота.`, {
        chat_id: callback.message.chat.id,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Купить",
                callback_data: `shop.${chatId}.${category}.${itemName}.buy.0`
            }], [{
                text: categoriesMap[category], callback_data: `shop.${chatId}.${category}`
            }, {
                text: "Главная", callback_data: `shop.${chatId}`
            }], [{
                text: "Закрыть", callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^shop\.([\-0-9]+)\.[^.]+\.([^.]+)\.buy\.0$/, async function (session, callback, [, chatId, itemName]) {
    let messageId = callback.message.message_id;
    let item = shopTemplate.filter(_item => _item.command === itemName);
    item = item[0];
    let foundSession = await getSession(chatId, callback.from.id);
    let sellItem = shopSellItem(foundSession, item.command, item);

    if (typeof sellItem === "string") {
        return sendMessageWithDelete(callback.message.chat.id, sellItem, {}, 10 * 1000);
    }

    await editMessageCaption(`Поздравляем с покупкой ${item.name}!`, {
        chat_id: callback.message.chat.id,
        message_id: messageId,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`shop.${chatId}`, buildCategoryKeyboard(chatId), 1)
        }
    }, callback.message.photo);
}]];