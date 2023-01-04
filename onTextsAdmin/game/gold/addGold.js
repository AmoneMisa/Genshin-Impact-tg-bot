const bot = require('../../../bot');
const sendMessage = require('../../../functions/sendMessage');
const getMemberStatus = require('../../../functions/getMemberStatus');
const debugMessage = require('../../../functions/debugMessage');
const buildKeyboard = require('../../../functions/buildKeyboard');
const controlButtons = require('../../../functions/controlButtons');

module.exports = [[/(?:^|\s)\/add_gold\b/, (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
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
    } catch (e) {
        debugMessage(`Command: /add_gold\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];