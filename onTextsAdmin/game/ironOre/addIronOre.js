const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getMemberStatus = require('../../../functions/getters/getMemberStatus');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/add_iron_ore\b/, (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);
    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let buttons = buildKeyboard(msg.chat.id, `add_iron_ore.${msg.chat.id}`);

    sendMessage(msg.from.id, "Выбери, кому ты хочешь добавить железной руды", {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`add_iron_ore.${msg.chat.id}`, buttons, 1)
        }
    });
}]];