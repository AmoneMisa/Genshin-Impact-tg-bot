const bot = require('../../../bot');
const sendMessage = require('../../../functions/sendMessage');
const debugMessage = require('../../../functions/debugMessage');
const buildKeyboard = require('../../../functions/buildKeyboard');
const controlButtons = require('../../../functions/controlButtons');
const getMemberStatus = require("../../../functions/getMemberStatus");

module.exports = [[/(?:^|\s)\/receive_user_chest_timer\b/, (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        if (!getMemberStatus(msg.chat.id, msg.from.id)) {
            return;
        }

        let buttons = buildKeyboard(msg.chat.id, `receive_chest_timer.${msg.chat.id}`);

        sendMessage(msg.from.id, "Выбери, кому ты хочешь обнулить таймер сундука", {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: controlButtons(`receive_chest_timer.${msg.chat.id}`, buttons, 1)
            }
        });
    } catch (e) {
        debugMessage(`Command: /receive_user_chest_timer\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];