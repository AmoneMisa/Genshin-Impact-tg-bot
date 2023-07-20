const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const getMemberStatus = require("../../../functions/getters/getMemberStatus");
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/add_crystals\b/, (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);

    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let buttons = buildKeyboard(msg.chat.id, `add_crystals.${msg.chat.id}`);

    sendMessage(msg.from.id, "Выбери, кому ты хочешь добавить кристаллов", {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`add_crystals.${msg.chat.id}`, buttons, 1)
        }
    });
}]];