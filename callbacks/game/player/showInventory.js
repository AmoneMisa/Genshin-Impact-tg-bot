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

module.exports = [[/player\.[\-0-9]+\.inventory$/, async function (session, callback) {
    // Меню инвентаря
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    const [, chatId] = callback.data.match(/^player\.([\-0-9]+)\.inventory$/);
    let foundedSession = await getSession(chatId, callback.from.id);
    let inventory = foundedSession.game.inventory;

    for (let value of Object.values(inventory)) {
        if (!Array.isArray(value)) {
            continue;
        }

        let foundedItems = value.filter(item => item.count > 0);
        if (foundedItems.length <= 0) {
            return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, у тебя нет ни одного предмета, с которым можно взаимодейстовать.`, {}, 10 * 1000);
        }
    }

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
            callback_data: `player.${chatId}.inventory.${key}`
        });
        i++;
    }

    return sendMessage(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(inventory)}`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [...controlButtons(`player.${chatId}.inventory`, buttons, 1)]
        }
    });
}], [/player\.[\-0-9]+\.inventory\.[^.]+$/, async function (session, callback) {
    // Меню категории инвентаря
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    const [, chatId, items] = callback.data.match(/^player\.([\-0-9]+)\.inventory\.([^.]+)$/);
    let foundedSession = await getSession(chatId, callback.from.id);
    let foundedItems = foundedSession.game.inventory[items].filter(item => item.count > 0);

    if (foundedItems.length <= 0) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, у тебя нет предметов в этом списке (${inventoryTranslate[items]}), с которыми можно взаимодейстовать.`, {}, 10 * 1000);
    }

    let buttons = [];
    let tempArray = null;
    let i = 0;

    let itemName = "";
    for (let item of foundedItems) {
        itemName = item.bottleType ? `${item.bottleType}.${item.type}.${item.power}` : item.type;
        if (i % 2 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }

        tempArray.push({
            text: `${getEmoji(itemName)} ${item.name}`,
            callback_data: `player.${chatId}.inventory.${items}.${itemName}`
        });
        i++;
    }

    return editMessageText(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(foundedItems)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [...buttons, [{
                text: "Назад", callback_data: `player.${chatId}.inventory`
            }, {
                text: "Закрыть", callback_data: "close"
            }]]
        }
    });
}], [/player\.[\-0-9]+\.inventory\.[^.]+\.[A-z.]+$/, async function (session, callback) {
    // Меню предмета инвентаря
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    const [, chatId, items, item] = callback.data.match(/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([A-z.]+)$/);
    let foundedSession = await getSession(chatId, callback.from.id);
    let foundedItem = foundedSession.game.inventory[items].find(_item => _item.type === item || `${_item.bottleType}.${_item.type}.${_item.power}` === item);
    console.log(foundedItem);
    if (!foundedItem) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, у тебя нет предметов в этом списке (${inventoryTranslate[items]}), с которыми можно взаимодейстовать.`, {}, 10 * 1000);
    }

    let itemName = foundedItem.bottleType ? `${foundedItem.bottleType}.${foundedItem.type}.${foundedItem.power}` : foundedItem.type;
    return editMessageText(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(foundedItem, true)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: `Использовать`,
                callback_data: `player.${chatId}.inventory.${items}.${itemName}.0`
            }], [{
                text: "Назад", callback_data: `player.${chatId}.inventory.${items}`
            }, {
                text: "Закрыть", callback_data: "close"
            }]]
        }
    });
}], [/player\.[\-0-9]+\.inventory\.[^.]\.[A-z.]\.0+$/, async function (session, callback) {
    // Меню подтверждения действия для предмета инвентаря
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    const [, chatId, items, item] = callback.data.match(/^player\.([\-0-9]+)\.inventory\.([^.]+)\.([A-z.]+)\.0$/);
    let foundedSession = await getSession(chatId, callback.from.id);
    let foundedItem = foundedSession.game.inventory[items].find(_item => _item.name === item);

    if (!foundedItem) {
        return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, у тебя нет предметов в этом списке (${inventoryTranslate[items]}), с которыми можно взаимодейстовать.`, {}, 10 * 1000);
    }

    let itemName = foundedItem.bottleType ? `${foundedItem.bottleType}.${foundedItem.type}` : foundedItem.type;

    if (item === "potion" || item === "elixir") {
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
                        callback_data: `player.${chatId}.inventory.${items}.${itemName}`
                    }, {text: "Закрыть", callback_data: "close"}]]
                }
            });
        }

        if (healResult === 2) {
            return editMessageText(`@${getUserName(session, "nickname")}, ты не ранен, незачем восстанавливать ${getEmoji("hp")} хп.`, {
                chat_id: callback.message.chat.id,
                message_id: callback.message.message_id,
                disable_notification: true,
                reply_markup: {
                    selective: true,
                    inline_keyboard: [[{
                        text: "Назад",
                        callback_data: `player.${chatId}.inventory.${items}.${itemName}`
                    }, {text: "Закрыть", callback_data: "close"}]]
                }
            });
        }

        if (healResult === 0) {
            await sendMessageWithDelete(chatId, `@${getUserName(session, "nickname")}, ты восстановил своё ${getEmoji("hp")} хп на ${foundedItem.power}.`, {
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

    return editMessageText(`@${getUserName(foundedSession, "nickname")}, ты использовал предмет: ${itemName}!`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [[{
                text: "Назад",
                callback_data: `player.${chatId}.inventory.${items}.${itemName}`
            }, {text: "Закрыть", callback_data: "close"}]]
        }
    });
}]];