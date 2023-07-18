const getUserName = require("../../../functions/getters/getUserName");
const getEmoji = require("../../../functions/getters/getEmoji");
const getInventoryMessage = require("../../../functions/game/player/getInventoryMessage");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const inventoryTranslate = require("../../../dictionaries/inventory");
const controlButtons = require("../../../functions/keyboard/controlButtons");

module.exports = [["player.inventory", function (session, callback) {
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    let chatId = callback.message.chat.id;
    let inventory = session.game.inventory;

    let info = "";

    let buttons = [];
    let tempArray = null;
    let i = 0;

    for (let key of Object.keys(inventory)) {
        if (i % 3 === 0) {
            tempArray = [];
            buttons.push(tempArray);
        }
        tempArray.push({text: `${getEmoji(key)} ${inventoryTranslate[key]}`, callback_data: `player.inventory.${key}`});
        info += getInventoryMessage(inventory);
        i++;
    }

    sendMessage(chatId, `@${getUserName(session, "nickname")}, ${info}`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            inline_keyboard: [...controlButtons("player.inventory", buttons, 1, true)]
        }
    });
}]];