const bot = require('../../../bot');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const getMemberStatus = require("../../../functions/getters/getMemberStatus");

module.exports = [[/(?:^|\s)\/add_experience\b/, (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        if (!getMemberStatus(msg.chat.id, msg.from.id)) {
            return;
        }

        let buttons = buildKeyboard(msg.chat.id, `add_experience.${msg.chat.id}`);

        sendMessage(msg.from.id, "Выбери, кому ты хочешь добавить опыта", {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: controlButtons(`add_experience.${msg.chat.id}`, buttons, 1)
            }
        });
    } catch (e) {
        debugMessage(`Command: /add_experience\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];