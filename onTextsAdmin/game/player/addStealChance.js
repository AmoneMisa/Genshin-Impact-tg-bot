const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const getMemberStatus = require("../../../functions/getters/getMemberStatus");
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/add_steal_chance\b/, async (msg) => {
    deleteMessage(msg.chat.id, msg.message_id);

    if (!getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    let buttons = buildKeyboard(msg.chat.id, `add_steal_chance.${msg.chat.id}`);

    await sendMessage(msg.from.id, "Выбери, кому ты хочешь попытку грабежа", {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: controlButtons(`add_steal_chance.${msg.chat.id}`, buttons, 1)
        }
    });
}]];