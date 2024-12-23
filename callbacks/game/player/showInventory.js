import getUserName from '../../../functions/getters/getUserName.js';
import getSession from '../../../functions/getters/getSession.js';
import getEmoji from '../../../functions/getters/getEmoji.js';
import getInventoryMessage from '../../../functions/game/player/getters/getInventoryMessage.js';
import equipItem from '../../../functions/game/equipment/equipItem.js';
import useHealPotion from '../../../functions/game/player/useHealPotion.js';
import editMessageMedia from '../../../functions/tgBotFunctions/editMessageMedia.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import inventoryTranslate from '../../../dictionaries/inventory.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import editMessageCaption from '../../../functions/tgBotFunctions/editMessageCaption.js';
import getFile from '../../../functions/getters/getFile.js';
import checkUserCall from '../../../functions/misc/checkUserCall.js';
import unequipItem from '../../../functions/game/equipment/unequipItem.js';
import nameShortener from "../../../functions/game/equipment/nameShortener.js";
import debugMessage from "../../../functions/tgBotFunctions/debugMessage.js";

let equipmentNames = ["accessories", "armor", "weapon", "cloak", "shield"];

function buildInventoryKeyboard(inventory, userId) {
    let buttons = [];
    let tempArray = null;
    let i = 0;
    let categoryList = new Set();

    for (let category of inventory) {
        if (category.categoryName === "gold" || category.categoryName === "ironOre" || category.categoryName === "crystals") {
            continue;
        }

        categoryList.add({categoryName: category.categoryName, name: category.name});
    }

    for (let category of categoryList) {
        if (i % 2 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }

        tempArray.push({
            text: `${getEmoji(category.categoryName)} ${category.name}`,
            callback_data: `player.${userId}.inventory.${category.categoryName}`
        });

        i++;
    }

    return buttons;
}

function buildInventoryCategoryItemKeyboard(foundedItems, chatId, items, isApprove) {
    if (!items) {
        debugMessage("buildInventoryCategoryItem: Не передан items");
        throw new Error("items doesn't exist");
    }

    if (items === "gacha") {
        return [];
    }

    let buttons = [];
    let tempArray = null;
    let i = 0;

    for (let j = 0; j < foundedItems.length; j++) {
        let item = foundedItems[j];
        if (i % 2 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }

        if (isApprove) {
            tempArray.push({
                text: `${getEmoji(item.type)} ${item.name}`,
                callback_data: `player.${chatId}.inventory.${items}.${j}.0`
            });
        } else if (items === "equipment") {
            tempArray.push({
                text: `${getEmoji(item.type)} ${item.isUsed ? '*' : ''}${nameShortener(item.name)}`,
                callback_data: `player.${chatId}.inventory.${items}.${j}`
            });
        } else {
            tempArray.push({
                text: `${getEmoji(items)} ${inventoryTranslate[Object.keys(item)[j]]}`,
                callback_data: `player.${chatId}.inventory.${items}.${j}`
            });
        }

        i++;
    }

    return buttons;
}

export default [[/player\.([\-0-9]+)\.inventory(?:\.back)?$/, async function (session, callback, [, chatId]) {
    // Меню инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }

    const isBack = callback.data.includes("back");
    let foundedSession = await getSession(chatId, callback.from.id);
    let inventory = foundedSession.game.inventory;
    let replyMarkup = {};

    let foundedItems = [];
    for (let [categoryName, category] of Object.entries(inventory)) {

        if (typeof category === "string" || typeof category === "number") {
            continue;
        }

        if (category.items.length > 0) {
            foundedItems.push({categoryName, name: category.name});
        }
    }
    if (foundedItems.length > 0) {
        replyMarkup = {
            selective: true,
            inline_keyboard: [...controlButtons(`player.${chatId}.inventory`, buildInventoryKeyboard(foundedItems, chatId), 1), [{
                text: "Главная",
                callback_data: `player.${chatId}.whoami`
            }]]
        };
    }

    if (isBack) {
        await editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(inventory)}`, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            reply_markup: replyMarkup
        }, callback.message.photo);
    } else {
        const file = getFile("images/misc", "inventory");
        await editMessageMedia(file, `@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(inventory)}`, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            disable_notification: true,
            reply_markup: replyMarkup
        });
    }
}], [/player\.([\-0-9]+)\.inventory_([^.]+)$/, async function (session, callback, [, chatId, page]) {
    // пагинация списка категорий
    page = parseInt(page);
    let foundedSession = await getSession(chatId, callback.from.id);

    await editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(foundedSession.game.inventory)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...controlButtons(`player.${chatId}.inventory`,
                buildInventoryKeyboard(foundedSession.game.inventory, chatId), page),
                [{
                    text: "Главная",
                    callback_data: `player.${chatId}.whoami`
                }]
            ]
        }
    }, callback.message.photo);
}], [/player\.([\-0-9]+)\.inventory\.([^.]+)_([^.]+)$/, async function (session, callback, [, chatId, items, page]) {
    // пагинация категории инвентаря
    page = parseInt(page);
    let foundedSession = await getSession(chatId, callback.from.id);
    let itemsWithIndex = [];
    let foundedItems;

    if (equipmentNames.includes(items)) {
        itemsWithIndex = foundedSession.game.inventory.equipment.items.map((item, i) => [i, item]);
        foundedItems = itemsWithIndex.filter(([i, equip]) => equip.mainType === items);
    } else if (items === "hp" || items === "mp" || items === "cp") {
        itemsWithIndex = foundedSession.game.inventory.potions.items.map((item, i) => [i, item]);
        foundedItems = itemsWithIndex.filter(([i, item]) => item.count > 0);
    } else if (items === "equipment" || items === "gacha") {
        foundedItems = foundedSession.game.inventory[items].items;
    } else {
        foundedItems = foundedSession.game.inventory[items].items.filter((item) => {
            return Object.values(item).every(value => value !== null && value > 0);
        });
    }

    await editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(foundedItems)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`player.${chatId}.inventory.${items}`,
                    buildInventoryCategoryItemKeyboard(foundedItems, chatId, items), page,
                    `player.${chatId}.inventory`, "Назад")
            ]
        }
    }, callback.message.photo);
}], [/^player\.([\-0-9]+)\.inventory\.([^._]+)$/, async function (session, callback, [, chatId, items]) {
    if (callback.data.includes("back")) {
        return;
    }
    // Меню категории инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }

    let foundedSession = await getSession(chatId, callback.from.id);
    let itemsWithIndex = [];
    let foundedItems;
    if (items.includes("NaN")) {
        return;
    }

    if (equipmentNames.includes(items)) {
        itemsWithIndex = foundedSession.game.inventory.equipment.items.map((item, i) => [i, item]);
        foundedItems = itemsWithIndex.filter(([i, equip]) => equip.mainType === items);
    } else if (items === "hp" || items === "mp" || items === "cp") {
        itemsWithIndex = foundedSession.game.inventory.potions.items.map((item, i) => [i, item]);
        foundedItems = itemsWithIndex.filter(([i, item]) => item.count > 0);
    } else if (items === "equipment") {
        foundedItems = foundedSession.game.inventory[items].items;
    } else {
        foundedItems = foundedSession.game.inventory[items].items.filter((item) => item.value !== null && item.value > 0);
    }

    if (!foundedItems || foundedItems.length <= 0) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, у тебя нет предметов в этом списке (${foundedSession.game.inventory[items].name}), с которыми можно взаимодействовать.`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 10 * 1000);
    }

    await editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(foundedItems, false, items)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [...controlButtons(`player.${chatId}.inventory.${items}`, buildInventoryCategoryItemKeyboard(foundedItems, chatId, items), 1),
                [
                    {
                        text: "Назад", callback_data: `player.${chatId}.inventory.back`
                    }, {
                    text: "Закрыть", callback_data: "close"
                }]]
        }
    }, callback.message.photo);
}], [/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([^.]+)$/, async function (session, callback, [, chatId, items, i]) {
    // Меню предмета инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }

    let foundedSession = await getSession(chatId, callback.from.id);
    let itemsList = foundedSession.game.inventory[items].items;
    let foundedItem = itemsList[i];

    let buttons = [{
        text: "Использовать",
        callback_data: `player.${chatId}.inventory.${items}.${i}.0`
    }]

    if (items === "equipment") {
        if (foundedItem.isUsed) {
            buttons[0].text = "Снять";
            buttons[0].callback_data = `player.${chatId}.inventory.${items}.${i}.1`;
        } else {
            buttons[0].text = "Надеть";
        }

        buttons.push({text: "Продать", callback_data: `player.${chatId}.inventory.${items}.${i}.2`})
    }

    if (!foundedItem) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, у тебя нет такого предмета.`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 10 * 1000);
    }

    await editMessageCaption(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(foundedItem, true)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [buttons, [{
                text: "Главная",
                callback_data: `player.${chatId}.whoami`
            }], [{
                text: "Назад", callback_data: `player.${chatId}.inventory.back`
            }, {
                text: "Закрыть", callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([^.]+)\.0$/, async function (session, callback, [, chatId, items, i]) {
    // Меню подтверждения действия для предмета инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }

    let foundedSession = await getSession(chatId, callback.from.id);
    let itemsList = foundedSession.game.inventory[items].items;

    let foundedItem = itemsList[i];

    if (!foundedItem) {
        return sendMessageWithDelete(callback.message.chat.id, `У тебя нет предметов в этом списке (${inventoryTranslate[items]}), с которыми можно взаимодействовать.`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 10 * 1000);
    }

    if (foundedItem.hasOwnProperty("bottleType")) {
        let healResult = useHealPotion(foundedSession, foundedItem);
        return sendHealMessage(healResult, callback, foundedSession, foundedItem, chatId);
    }

    if (equipmentNames.includes(foundedItem.mainType)) {
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
                    text: "Главная",
                    callback_data: `player.${chatId}.whoami`
                }], [{
                    text: "Назад",
                    callback_data: `player.${chatId}.inventory.back`
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
                text: "Главная",
                callback_data: `player.${chatId}.whoami`
            }], [{
                text: "Назад",
                callback_data: `player.${chatId}.inventory.back`
            }, {
                text: "Закрыть", callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([^.]+)\.1$/, async function (session, callback, [, chatId, items, i]) {
    // Меню подтверждения действия для предмета инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }
    let foundedSession = await getSession(chatId, callback.from.id);
    let itemsList = foundedSession.game.inventory.equipment.items;
    let foundedItem = itemsList[i];

    if (!foundedItem) {
        return sendMessageWithDelete(callback.message.chat.id, `Произошла ошибка при попытке взаимодействия с (${inventoryTranslate[items]}).`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 10 * 1000);
    }

    let equipResult = equipItem(foundedSession, foundedItem);
    if (equipResult === 1) {
        unequipItem(foundedSession, foundedItem);
    } else {
        return sendMessageWithDelete(callback.message.chat.id, `Произошла ошибка при попытке снять предмет (${foundedItem.name}).`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 10 * 1000);
    }

    await editMessageCaption(`@${getUserName(foundedSession, "nickname")}, снаряжение снято: ${foundedItem.name}!`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: "Главная",
                callback_data: `player.${chatId}.whoami`
            }], [{
                text: "Назад",
                callback_data: `player.${chatId}.inventory.back`
            }, {
                text: "Закрыть", callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([^.]+)\.2$/, async function (session, callback, [, chatId, items, i]) {
    // Меню подтверждения действия для предмета инвентаря
    if (!checkUserCall(callback, session)) {
        return;
    }

    if (!equipmentNames.includes(items)) {
        return;
    }

    let foundedSession = await getSession(chatId, callback.from.id);
    let itemsList = foundedSession.game.inventory.equipment.items;
    let foundedItem = itemsList[i];

    if (!foundedItem) {
        return sendMessageWithDelete(callback.message.chat.id, `Произошла ошибка при попытке взаимодействия с (${inventoryTranslate[items]}).`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 10 * 1000);
    }

    let equipResult = equipItem(foundedSession, foundedItem);
    if (equipResult === 1) {
        unequipItem(foundedSession.game, foundedItem);
        let indexOf = foundedSession.game.inventory.equipment.items.indexOf(foundedItem);
        foundedSession.game.inventory.gold += foundedItem.cost;
        foundedSession.game.inventory.equipment.items.splice(indexOf, 1);
    } else {
        return sendMessageWithDelete(callback.message.chat.id, `Произошла ошибка при попытке продать предмет (${foundedItem.name}).`, {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 10 * 1000);
    }

    await editMessageCaption(`@${getUserName(foundedSession, "nickname")}, снаряжение продано: ${foundedItem.name}! Получено золота: ${foundedItem.cost}. ${getEmoji("gold")} Твоё золото: ${foundedSession.game.inventory.gold}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: "Главная",
                callback_data: `player.${chatId}.whoami`
            }], [{
                text: "Назад",
                callback_data: `player.${chatId}.inventory.back`
            }, {text: "Закрыть", callback_data: "close"}]]
        }
    }, callback.message.photo);
}]];

async function sendHealMessage(result, callback, session, foundedItem, chatId) {
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
                text: "Главная",
                callback_data: `player.${chatId}.whoami`
            }], [{
                text: "Назад",
                callback_data: `player.${chatId}.inventory.back`
            }, {
                text: "Закрыть", callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}