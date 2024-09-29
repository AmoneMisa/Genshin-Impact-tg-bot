const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const getMemberStatus = require("../../../functions/getters/getMemberStatus");
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/receive_user_title_timer\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let buttons = buildKeyboard(msg.chat.id, `receive_title_timer.${msg.chat.id}`);

    await sendMessage(msg.from.id, "Выбери, кому ты хочешь обнулить таймер титула", {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`receive_title_timer.${msg.chat.id}`, buttons, 1)
        }
    });
}]];