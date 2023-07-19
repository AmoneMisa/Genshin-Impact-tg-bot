const getUserName = require("../../../functions/getters/getUserName");
const getSession = require("../../../functions/getters/getSession");
const getEmoji = require("../../../functions/getters/getEmoji");
const getInventoryMessage = require("../../../functions/game/player/getInventoryMessage");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const inventoryTranslate = require("../../../dictionaries/inventory");
const controlButtons = require("../../../functions/keyboard/controlButtons");

module.exports = [[/player\.[\-0-9]+\.inventory/, async function (session, callback) {
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }
    const [, chatId] = callback.data.match(/^player\.([\-0-9]+)\.inventory$/);
    let foundedSession = await getSession(chatId, callback.from.id);
    let inventory = foundedSession.game.inventory;

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
        tempArray.push({text: `${getEmoji(key)} ${inventoryTranslate[key]}`, callback_data: `player.inventory.${key}`});
        i++;
    }

    sendMessage(callback.message.chat.id, `@${getUserName(foundedSession, "nickname")}, ${getInventoryMessage(inventory)}`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [...controlButtons("player.inventory", buttons, 1)]
        }
    });
}]];