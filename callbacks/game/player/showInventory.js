const getUserName = require("../../../functions/getters/getUserName");
const getSession = require("../../../functions/getters/getSession");
const getEmoji = require("../../../functions/getters/getEmoji");
const getInventoryMessage = require("../../../functions/game/player/getInventoryMessage");
const useHealPotion = require("../../../functions/game/player/useHealPotion");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const inventoryTranslate = require("../../../dictionaries/inventory");
const controlButtons = require("../../../functions/keyboard/controlButtons");
const editMessageText = require('../../../functions/tgBotFunctions/editMessageText');

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

module.exports = [[/player\.[\-0-9]+\.inventory(?:\.back)?$/, async function (session, callback) {
    // Меню инвентаря
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }
    const isBack = callback.data.includes("back");
    const [, userId] = callback.data.match(/^player\.([\-0-9]+)\.inventory$/);
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
                seceltive: true,
                inline_keyboard: [...controlButtons(`player.${userId}.inventory`, buildInventoryKeyboard(foundedSession.game.inventory, userId), 1)]
            };
        }
    }

    if (isBack) {
        return editMessageText(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(inventory)}`, {
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            reply_markup: replyMarkup
        });
    }

    return sendMessage(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(inventory)}`, {
        disable_notification: true,
        reply_markup: replyMarkup
    });
}], [/player\.[\-0-9]+\.inventory_[^.]+$/, async function (session, callback) {
    let [, userId, page] = callback.data.match(/player\.[\-0-9]+\.inventory_([^.]+)$/);
    page = parseInt(page);
    let foundedSession = await getSession(userId, callback.from.id);
    let inventory = foundedSession.game.inventory;

    return editMessageText(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(inventory)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`player.${userId}.inventory`, buildInventoryKeyboard(foundedSession.game.inventory, userId), page)
            ]
        }
    });
}], [/player\.[\-0-9]+\.inventory\.[^.]+$/, async function (session, callback) {
    // Меню категории инвентаря
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    const [, userId, items] = callback.data.match(/^player\.([\-0-9]+)\.inventory\.([^.]+)$/);
    let foundedSession = await getSession(userId, callback.from.id);
    let foundedItems = foundedSession.game.inventory[items].filter(item => item.count > 0);

    if (foundedItems.length <= 0) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, у тебя нет предметов в этом списке (${inventoryTranslate[items]}), с которыми можно взаимодейстовать.`, {}, 10 * 1000);
    }

    return editMessageText(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(foundedItems)}`, {
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
    });
}], [/player\.[\-0-9]+\.inventory\.[^.]+\.[^.]+$/, async function (session, callback) {
    // Меню предмета инвентаря
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    const [, userId, items, item] = callback.data.match(/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([^.]+)$/);
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
    return editMessageText(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(foundedItem, true)}`, {
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
    });
}], [/player\.[\-0-9]+\.inventory\.[^.]+\.[^.]+\.0+$/, async function (session, callback) {
    // Меню подтверждения действия для предмета инвентаря
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    const [, userId, items, item] = callback.data.match(/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([^.]+)\.0$/);
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
            return editMessageText(`@${getUserName(session, "nickname")}, ты мёртв. Ты восстановишь ${getEmoji("hp")} хп после нового призыва босса.`, {
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
            });
        }

        if (healResult === 2) {
            return editMessageText(`@${getUserName(session, "nickname")}, ты не ранен, нет нужды восстанавливать ${getEmoji("hp")} хп.`, {
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
            });
        }

        if (healResult === 0) {
            sendMessageWithDelete(userId, `@${getUserName(session, "nickname")}, ты восстановил своё ${getEmoji("hp")} хп на ${foundedItem.power}.`, {
                chat_id: callback.message.chat.id,
                message_id: callback.message.message_id,
                disable_notification: true,
                reply_markup: {
                    selective: true,
                    inline_keyboard: [[{text: "Закрыть", callback_data: "close"}]]
                }
            }, {}, 15 * 1000);
        }
    }

    return editMessageText(`@${getUserName(foundedSession, "nickname")}, ты использовал предмет: ${foundedItem.name}!`, {
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
    });
}]];