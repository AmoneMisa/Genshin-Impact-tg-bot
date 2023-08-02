const getUserName = require("../../../functions/getters/getUserName");
const getSession = require("../../../functions/getters/getSession");
const getEmoji = require("../../../functions/getters/getEmoji");
const getInventoryMessage = require("../../../functions/game/player/getInventoryMessage");
const useHealPotion = require("../../../functions/game/player/useHealPotion");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const sendPhoto = require("../../../functions/tgBotFunctions/sendPhoto");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const inventoryTranslate = require("../../../dictionaries/inventory");
const controlButtons = require("../../../functions/keyboard/controlButtons");
const editMessageCaption = require('../../../functions/tgBotFunctions/editMessageCaption');
const getFile = require("../../../functions/getters/getFile");
const checkUserCall = require("../../../functions/misc/checkUserCall");
const editMessageMedia = require("../../../functions/tgBotFunctions/editMessageMedia");
const buttonsDictionary = require("../../../dictionaries/buttons");

function buildInventoryKeyboard(inventory, userId) {
    let buttons = [];
    let tempArray = null;
    let i = 0;

    for (let key of Object.keys(inventory)) {
        if (!Array.isArray(inventory[key])) {
            continue;
        }

        if (i % 3 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }

        tempArray.push({
            text: `${getEmoji(key)} ${inventoryTranslate[key]}`,
            callback_data: `player.${userId}.inventory.${key}`
        });

        i++;
    }

    return buttons;
}

function buildInventoryCategoryItemKeyboard(foundedItems, userId, items, isApprove) {
    let buttons = [];
    let tempArray = null;
    let i = 0;

    for (let item of foundedItems) {
        let itemName = items === "potions" ? `${item.bottleType}-${item.type}-${item.power}` : item.type;

        if (i % 2 === 0) {
            tempArray = [];
            buttons.push(tempArray);

        }

        if (isApprove) {
            tempArray.push({
                text: `${getEmoji(item.type)} ${item.name}`,
                callback_data: `player.${userId}.inventory.${items}.${itemName}.0`
            });
        } else {
            tempArray.push({
                text: `${getEmoji(item.type)} ${item.name}`,
                callback_data: `player.${userId}.inventory.${items}.${itemName}`
            });
        }

        i++;
    }

    return buttons;
}

function getItemData(item, items) {
    const data = item.split('-');

    if (items === "potions") {
        return {bottleType: data[0], type: data[1], power: parseInt(data[2])}
    }

    if (items === "equipment") {
        return {type: data[0], rare: data[1], material: data[2], lvl: parseInt(data[3])}
    }

    throw new Error(`Не найдено такой категории: ${items}`);
}

module.exports = [[/player\.([\-0-9]+)\.inventory(?:\.back)?$/, async function (session, callback, [, userId]) {
    // Меню инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }

    const isBack = callback.data.includes("back");
    let foundedSession = await getSession(userId, callback.from.id);
    let inventory = foundedSession.game.inventory;
    let replyMarkup = {};

    for (let value of Object.values(inventory)) {
        if (!Array.isArray(value)) {
            continue;
        }

        let foundedItems = value.filter(item => item.count > 0);

        if (foundedItems.length > 0) {
            replyMarkup = {
                selective: true,
                inline_keyboard: [...controlButtons(`player.${userId}.inventory`, buildInventoryKeyboard(foundedSession.game.inventory, userId), 1)]
            };
        }
    }

    if (isBack) {
        return editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(inventory)}`, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            reply_markup: replyMarkup
        }, callback.message.photo);
    }

    const file = getFile("images/misc", "inventory");

    if (file) {
        await sendPhoto(callback.message.chat.id, file, {
            caption: `@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(inventory)}`,
            disable_notification: true,
            reply_markup: replyMarkup
        });
    } else {
        await sendMessage(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(inventory)}`, {
            disable_notification: true,
            reply_markup: replyMarkup
        });
    }
}], [/player\.[\-0-9]+\.inventory_([^.]+)$/, async function (session, callback, [, userId, page]) {
    page = parseInt(page);
    let foundedSession = await getSession(userId, callback.from.id);
    let inventory = foundedSession.game.inventory;

    return editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(inventory)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`player.${userId}.inventory`, buildInventoryKeyboard(foundedSession.game.inventory, userId), page)
            ]
        }
    }, callback.message.photo);
}], [/^player\.([\-0-9]+)\.inventory\.([^.]+)$/, async function (session, callback, [, userId, items]) {
    // Меню категории инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }

    let foundedSession = await getSession(userId, callback.from.id);
    let foundedItems = foundedSession.game.inventory[items].filter(item => item.count > 0);

    if (foundedItems.length <= 0) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, у тебя нет предметов в этом списке (${inventoryTranslate[items]}), с которыми можно взаимодействовать.`, {}, 10 * 1000);
    }

    return editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(foundedItems)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [...buildInventoryCategoryItemKeyboard(foundedItems, userId, items), [{
                text: "Назад", callback_data: `player.${userId}.inventory`
            }, {
                text: "Закрыть", callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([^.]+)$/, async function (session, callback, [, userId, items, item]) {
    // Меню предмета инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }

    let foundedSession = await getSession(userId, callback.from.id);
    let itemData = getItemData(item, items);
    let foundedItem;

    if (items === "potions") {
        foundedItem = foundedSession.game.inventory[items].find(_item => _item.type === itemData.type && _item.bottleType === itemData.bottleType && _item.power === itemData.power);
    } else if (items === "equipment") {
        foundedItem = foundedSession.game.inventory[items].find(_item => _item.type === item && _item.rare === itemData.rare && _item.material === itemData.material && _item.lvl === itemData.lvl);
    }
    if (!foundedItem) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, у тебя нет такого предмета.`, {}, 10 * 1000);
    }

    let itemName = foundedItem.bottleType ? `${foundedItem.bottleType}-${foundedItem.type}-${foundedItem.power}` : foundedItem.type;
    return editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(foundedItem, true)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: `Использовать`,
                callback_data: `player.${userId}.inventory.${items}.${itemName}.0`
            }], [{
                text: "Назад", callback_data: `player.${userId}.inventory`
            }, {
                text: "Закрыть", callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([^.]+)\.0$/, async function (session, callback, [, userId, items, item]) {
    // Меню подтверждения действия для предмета инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }

    let foundedSession = await getSession(userId, callback.from.id);
    let itemData = getItemData(item, items);
    let foundedItem;

    if (items === "potions") {
        foundedItem = foundedSession.game.inventory[items].find(_item => _item.type === itemData.type && _item.bottleType === itemData.bottleType && _item.power === itemData.power);
    } else if (items === "equipment") {
        foundedItem = foundedSession.game.inventory[items].find(_item => _item.type === item && _item.rare === itemData.rare && _item.material === itemData.material && _item.lvl === itemData.lvl);
    }

    if (!foundedItem) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, у тебя нет предметов в этом списке (${inventoryTranslate[items]}), с которыми можно взаимодейстовать.`, {}, 10 * 1000);
    }

    if (item.includes("potion-hp") || item.includes("elixir-hp")) {
        let healResult = useHealPotion(foundedSession, foundedItem);
        if (healResult === 1) {
            return editMessageCaption(`@${getUserName(session, "nickname")}, ты мёртв. Ты восстановишь ${getEmoji("hp")} хп после нового призыва босса.`, {
                chat_id: callback.message.chat.id,
                message_id: callback.message.message_id,
                disable_notification: true,
                reply_markup: {
                    selective: true,
                    inline_keyboard: [[{
                        text: "Назад",
                        callback_data: `player.${userId}.inventory`
                    }, {text: "Закрыть", callback_data: "close"}]]
                }
            }, callback.message.photo);
        }

        if (healResult === 2) {
            return editMessageCaption(`@${getUserName(session, "nickname")}, ты не ранен, нет нужды восстанавливать ${getEmoji("hp")} хп.`, {
                chat_id: callback.message.chat.id,
                message_id: callback.message.message_id,
                disable_notification: true,
                reply_markup: {
                    selective: true,
                    inline_keyboard: [[{
                        text: "Назад",
                        callback_data: `player.${userId}.inventory`
                    }, {text: "Закрыть", callback_data: "close"}]]
                }
            }, callback.message.photo);
        }

        if (healResult === 0) {
            await editMessageCaption(`@${getUserName(session, "nickname")}, ты восстановил своё ${getEmoji("hp")} хп на ${foundedItem.power}.`, {
                chat_id: callback.message.chat.id,
                message_id: callback.message.message_id,
                disable_notification: true,
                reply_markup: {
                    selective: true,
                    inline_keyboard: [[{
                        text: "Назад",
                        callback_data: `player.${userId}.inventory`
                    }, {text: "Закрыть", callback_data: "close"}]]
                }
            }, callback.message.photo);
        }
    }

    return editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ты использовал предмет: ${foundedItem.name}!`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: "Назад",
                callback_data: `player.${userId}.inventory`
            }, {text: "Закрыть", callback_data: "close"}]]
        }
    }, callback.message.photo);
}]];