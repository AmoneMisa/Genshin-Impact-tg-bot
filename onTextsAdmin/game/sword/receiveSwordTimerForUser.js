const bot = require('../../../bot');
const sendMessage = require('../../../functions/sendMessage');
const debugMessage = require('../../../functions/debugMessage');
const buildKeyboard = require('../../../functions/buildKeyboard');
const controlButtons = require('../../../functions/controlButtons');
const getMemberStatus = require("../../../functions/getMemberStatus");

module.exports = [[/(?:^|\s)\/receive_user_sword_timer\b/, (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        if (!getMemberStatus(msg.chat.id, msg.from.id)) {
            return;
        }

        let buttons = buildKeyboard(msg.chat.id, `receive_sword_timer.${msg.chat.id}`);

        sendMessage(msg.from.id, "Выбери, кому ты хочешь обнулить таймер меча", {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: controlButtons(`receive_sword_timer.${msg.chat.id}`, buttons, 1)
            }
        });
    } catch (e) {
        debugMessage(`Command: /receive_user_sword_timer\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];