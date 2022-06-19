const bot = require('../../../bot');
const sendMessage = require('../../../functions/sendMessage');
const getMembers = require('../../../functions/getMembers');
const debugMessage = require('../../../functions/debugMessage');
const buildKeyboard = require('../../../functions/buildKeyboard');
const controlButtons = require('../../../functions/controlButtons');

module.exports = [[/(?:^|\s)\/receive_user_chest_timer\b/, (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        let members = getMembers(msg.chat.id);
        if (members[msg.from.id].userChatData.status !== "administrator" && members[msg.from.id].userChatData.status !== "creator") {
            return;
        }

        let buttons = buildKeyboard(msg.chat.id, `receive_chest_timer.${msg.chat.id}`);

        sendMessage(msg.from.id, "Выбери, кому ты хочешь обнулить таймер сундука", {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: controlButtons("receive_chest_timer", buttons, 1)
            }
        });
    } catch (e) {
        debugMessage(`Command: /receive_user_chest_timer\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];