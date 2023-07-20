const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getMemberStatus = require('../../../functions/getters/getMemberStatus');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/add_gold\b/, (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);
    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let buttons = buildKeyboard(msg.chat.id, `add_gold.${msg.chat.id}`);

    sendMessage(msg.from.id, "Выбери, кому ты хочешь добавить золота", {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`add_gold.${msg.chat.id}`, buttons, 1)
        }
    });
}]];