const getUserName = require("../../../functions/getters/getUserName");
const getSession = require("../../../functions/getters/getSession");
const getEmoji = require("../../../functions/getters/getEmoji");
const getInventoryMessage = require("../../../functions/game/player/getters/getInventoryMessage");
const equipItem = require("../../../functions/game/equipment/equipItem");
const useHealPotion = require("../../../functions/game/player/useHealPotion");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const sendPhoto = require("../../../functions/tgBotFunctions/sendPhoto");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const inventoryTranslate = require("../../../dictionaries/inventory");
const controlButtons = require("../../../functions/keyboard/controlButtons");
const editMessageCaption = require('../../../functions/tgBotFunctions/editMessageCaption');
const getFile = require("../../../functions/getters/getFile");
const checkUserCall = require("../../../functions/misc/checkUserCall");
const unequipItem = require("../../../functions/game/equipment/unequipItem");

let equipmentNames = ["accessories", "armor", "weapon", "cloak", "shield"];

function buildInventoryKeyboard(inventory, userId) {
    let buttons = [];
    let tempArray = null;
    let i = 0;
    let categoryList = new Set();

    for (let value of inventory) {
        if (typeof value === "string" || typeof value === "number") {
            continue;
        }

        if (value.hasOwnProperty("mainType")) {
            categoryList.add(value.mainType);
        } else if (value.hasOwnProperty("type")) {
            categoryList.add(value.type);
        } else {
            categoryList.add(value.name);
        }
    }

    for (let category of categoryList) {
        if (i % 2 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }

        tempArray.push({
            text: `${getEmoji(category)} ${inventoryTranslate[category]}`,
            callback_data: `player.${userId}.inventory.${category}`
        });

        i++;
    }

    return buttons;
}

function buildInventoryCategoryItemKeyboard(foundedItems, userId, items, isApprove) {
    let buttons = [];
    let tempArray = null;
    let i = 0;

    for (let [j, item] of foundedItems) {

        if (i % 2 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }

        if (isApprove) {
            tempArray.push({
                text: `${getEmoji(item.type)} ${item.name}`,
                callback_data: `player.${userId}.inventory.${items}.${j}.0`
            });
        } else {
            tempArray.push({
                text: `${getEmoji(item.type)} ${item.name}`,
                callback_data: `player.${userId}.inventory.${items}.${j}`
            });
        }

        i++;
    }

    return buttons;
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

    let foundedItems = [];
    for (let [key, value] of Object.entries(inventory)) {

        if (typeof value === "string" || typeof value === "number" || key === "gacha") {
            continue;
        }

        for (let item of value) {
            if (item.hasOwnProperty("bottleType")) {
                foundedItems = [...foundedItems, ...value.filter(item => item.count > 0)];
            } else {
                foundedItems.push(item);
            }
        }
    }

    if (foundedItems.length > 0) {
        replyMarkup = {
            selective: true,
            inline_keyboard: [...controlButtons(`player.${userId}.inventory`, buildInventoryKeyboard(foundedItems, userId), 1)]
        };
    }

    if (isBack) {
        await editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(inventory)}`, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            reply_markup: replyMarkup
        }, callback.message.photo);

        return;
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

    await editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(inventory)}`, {
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
    if (callback.data.includes("back")) {
        return;
    }
    // Меню категории инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }

    let foundedSession = await getSession(userId, callback.from.id);
    let itemsWithIndex = [];
    let foundedItems;

    if (equipmentNames.includes(items)) {
        itemsWithIndex = foundedSession.game.inventory.equipment.map((item, i) => [i, item]);
        foundedItems = itemsWithIndex.filter(([i, equip]) => equip.mainType === items);
    } else {
        itemsWithIndex = foundedSession.game.inventory[items].map((item, i) => [i, item]);
        foundedItems = itemsWithIndex.filter(([i, item]) => item.count > 0);
    }

    if (foundedItems.length <= 0) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, у тебя нет предметов в этом списке (${inventoryTranslate[items]}), с которыми можно взаимодействовать.`, {}, 10 * 1000);
    }

    await editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(foundedItems)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [...buildInventoryCategoryItemKeyboard(foundedItems, userId, items), [{
                text: "Назад", callback_data: `player.${userId}.inventory.back`
            }, {
                text: "Закрыть", callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([^.]+)$/, async function (session, callback, [, userId, items, i]) {
    // Меню предмета инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }

    let foundedSession = await getSession(userId, callback.from.id);
    let itemsList;

    if (equipmentNames.includes(items)) {
        itemsList = foundedSession.game.inventory.equipment;
    } else {
        itemsList = foundedSession.game.inventory[items];
    }

    let itemData = itemsList[i];
    let foundedItem;

    let buttons = [{
        text: "Использовать",
        callback_data: `player.${userId}.inventory.${items}.${i}.0`
    }]

    if (items === "potions") {
        foundedItem = foundedSession.game.inventory[items].find(_item => _item.type === itemData.type && _item.bottleType === itemData.bottleType && _item.power === itemData.power);
    } else if (equipmentNames.includes(items)) {
        foundedItem = foundedSession.game.inventory.equipment.find(_item =>
            _item.grade === itemData.grade
            && _item.rarity === itemData.rarity
            && _item.mainType === itemData.mainType
            && _item.cost === itemData.cost
        );


        if (foundedItem.isUsed) {
            buttons[0].text = "Снять";
            buttons[0].callback_data = `player.${userId}.inventory.${items}.${i}.1`;
        } else {
            buttons[0].text = "Надеть";
        }

        buttons.push({text: "Продать", callback_data: `player.${userId}.inventory.${items}.${i}.2`})
    }

    if (!foundedItem) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, у тебя нет такого предмета.`, {}, 10 * 1000);
    }

    await editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(foundedItem, true)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [buttons, [{
                text: "Назад", callback_data: `player.${userId}.inventory.back`
            }, {
                text: "Закрыть", callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([^.]+)\.0$/, async function (session, callback, [, userId, items, i]) {
    // Меню подтверждения действия для предмета инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }

    let foundedSession = await getSession(userId, callback.from.id);
    let itemsList;

    if (equipmentNames.includes(items)) {
        itemsList = foundedSession.game.inventory.equipment;
    } else {
        itemsList = foundedSession.game.inventory[items];
    }

    let itemData = itemsList[i];
    let foundedItem;

    if (items === "potions") {
        foundedItem = foundedSession.game.inventory[items].find(_item => _item.type === itemData.type && _item.bottleType === itemData.bottleType && _item.power === itemData.power);
    } else if (equipmentNames.includes(items)) {
        foundedItem = foundedSession.game.inventory.equipment.find(_item =>
            _item.grade === itemData.grade
            && _item.rarity === itemData.rarity
            && _item.mainType === itemData.mainType
            && _item.cost === itemData.cost
        );
    }

    if (!foundedItem) {
        return sendMessageWithDelete(callback.message.chat.id, `У тебя нет предметов в этом списке (${inventoryTranslate[items]}), с которыми можно взаимодействовать.`, {}, 10 * 1000);
    }

    if (itemData.hasOwnProperty("bottleType")) {
        let healResult = useHealPotion(foundedSession, foundedItem);
        return sendHealMessage(healResult, callback, foundedSession, foundedItem, userId);
    }

    if (equipmentNames.includes(itemData.mainType)) {
        let equipResult = equipItem(foundedSession, foundedItem);
        let message;

        if (equipResult === 0) {
            message = `@${getUserName(foundedSession, "nickname")}, ты надел предмет: ${foundedItem.name}!`;
        } else {
            return;
        }

        return editMessageCaption(message, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            disable_notification: true,
            reply_markup: {
                selective: true,
                inline_keyboard: [[{
                    text: "Назад",
                    callback_data: `player.${userId}.inventory.back`
                }, {
                    text: "Закрыть", callback_data: "close"
                }]]
            }
        }, callback.message.photo);
    }

    await editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ты использовал предмет: ${foundedItem.name}!`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: "Назад",
                callback_data: `player.${userId}.inventory.back`
            }, {
                text: "Закрыть", callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([^.]+)\.1$/, async function (session, callback, [, userId, items, i]) {
    // Меню подтверждения действия для предмета инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }

    if (!equipmentNames.includes(items)) {
        return;
    }

    let foundedSession = await getSession(userId, callback.from.id);
    let itemsList = foundedSession.game.inventory.equipment;
    let itemData = itemsList[i];
    let foundedItem = foundedSession.game.inventory.equipment.find(_item =>
        _item.grade === itemData.grade
        && _item.rarity === itemData.rarity
        && _item.mainType === itemData.mainType
        && _item.cost === itemData.cost
    );

    if (!foundedItem) {
        return sendMessageWithDelete(callback.message.chat.id, `Произошла ошибка при попытке взаимодействия с (${inventoryTranslate[items]}).`, {}, 10 * 1000);
    }

    let equipResult = equipItem(foundedSession, foundedItem);
    if (equipResult === 1) {
        unequipItem(foundedSession.game, foundedItem);
    } else {
        return sendMessageWithDelete(callback.message.chat.id, `Произошла ошибка при попытке снять предмет (${foundedItem.name}).`, {}, 10 * 1000);
    }

    await editMessageCaption(`@${getUserName(foundedSession, "nickname")}, снаряжение снято: ${foundedItem.name}!`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: "Назад",
                callback_data: `player.${userId}.inventory.back`
            }, {text: "Закрыть", callback_data: "close"}]]
        }
    }, callback.message.photo);
}], [/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([^.]+)\.2$/, async function (session, callback, [, userId, items, i]) {
    // Меню подтверждения действия для предмета инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }

    if (!equipmentNames.includes(items)) {
        return;
    }

    let foundedSession = await getSession(userId, callback.from.id);
    let itemsList = foundedSession.game.inventory.equipment;
    let itemData = itemsList[i];
    let foundedItem = foundedSession.game.inventory.equipment.find(_item =>
        _item.grade === itemData.grade
        && _item.rarity === itemData.rarity
        && _item.mainType === itemData.mainType
        && _item.cost === itemData.cost
    );

    if (!foundedItem) {
        return sendMessageWithDelete(callback.message.chat.id, `Произошла ошибка при попытке взаимодействия с (${inventoryTranslate[items]}).`, {}, 10 * 1000);
    }

    let equipResult = equipItem(foundedSession, foundedItem);
    if (equipResult === 1) {
        unequipItem(foundedSession.game, foundedItem);
        let indexOf = foundedSession.game.inventory.equipment.indexOf(foundedItem);
        foundedSession.game.inventory.gold += foundedItem.cost;
        foundedSession.game.inventory.equipment.splice(indexOf, 1);
    } else {
        return sendMessageWithDelete(callback.message.chat.id, `Произошла ошибка при попытке продать предмет (${foundedItem.name}).`, {}, 10 * 1000);
    }

    await editMessageCaption(`@${getUserName(foundedSession, "nickname")}, снаряжение продано: ${foundedItem.name}! Получено золота: ${foundedItem.cost}. ${getEmoji("gold")} Твоё золото: ${foundedSession.game.inventory.gold}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: "Назад",
                callback_data: `player.${userId}.inventory.back`
            }, {text: "Закрыть", callback_data: "close"}]]
        }
    }, callback.message.photo);
}]];

async function sendHealMessage(result, callback, session, foundedItem, userId) {
    let message = "";

    if (result === 0) {
        message = `@${getUserName(session, "nickname")}, ты восстановил своё ${getEmoji("hp")} хп на ${foundedItem.power}.`;
    }

    if (result === 1) {
        message = `@${getUserName(session, "nickname")}, ты мёртв. Ты восстановишь ${getEmoji("hp")} хп после нового призыва босса.`;
    }

    if (result === 2) {
        message = `@${getUserName(session, "nickname")}, ты не ранен, нет нужды восстанавливать ${getEmoji("hp")} хп.`;
    }

    await editMessageCaption(message, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: "Назад",
                callback_data: `player.${userId}.inventory.back`
            }, {
                text: "Закрыть", callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}