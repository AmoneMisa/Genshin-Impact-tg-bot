const bot = require('../../../bot');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const getMemberStatus = require('../../../functions/getters/getMemberStatus');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const controlButtons = require('../../../functions/keyboard/controlButtons');

module.exports = [[/(?:^|\s)\/add_iron_ore\b/, (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
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
    } catch (e) {
        debugMessage(`Command: /add_iron_ore\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];