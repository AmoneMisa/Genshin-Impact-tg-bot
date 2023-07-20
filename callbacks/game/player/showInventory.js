const getUserName = require("../../../functions/getters/getUserName");
const getSession = require("../../../functions/getters/getSession");
const getEmoji = require("../../../functions/getters/getEmoji");
const getInventoryMessage = require("../../../functions/game/player/getInventoryMessage");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const inventoryTranslate = require("../../../dictionaries/inventory");
const controlButtons = require("../../../functions/keyboard/controlButtons");
const editMessageText = require('../../../functions/tgBotFunctions/editMessageText');

module.exports = [[/player\.[\-0-9]+\.inventory$/, async function (session, callback) {
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
        itemName = item.bottleType ? `${item.bottleType}.${item.type}` : item.type;
        if (i % 2 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }

        tempArray.push({
            text: `${getEmoji(itemName)} ${item.name}`,
            callback_data: `player.${chatId}.inventory.${itemName}`
        });
        i++;
    }

    return editMessageText(`@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(inventory)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [...controlButtons(`player.${chatId}.inventory.${itemName}`, buttons, 1)]
        }
    });
}]];