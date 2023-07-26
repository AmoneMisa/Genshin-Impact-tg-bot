const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const getMemberStatus = require("../../../functions/getters/getMemberStatus");
const buildKeyboard = require("../../../functions/keyboard/buildKeyboard");
const controlButtons = require("../../../functions/keyboard/controlButtons");

module.exports = [[/(?:^|\s)\/update_characteristics\b/, async (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);

    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let buttons = [...buildKeyboard(msg.chat.id, `update_characteristics.${msg.chat.id}`), [{text: "Все", callback_data: `update_characteristics.${msg.chat.id}.all`}]];

    return sendMessage(msg.from.id, "Выбери, кому ты хочешь пересчитать характеристики", {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`update_characteristics.${msg.chat.id}`, buttons, 1)
        }
    });
}]];