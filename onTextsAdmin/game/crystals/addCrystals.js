const bot = require('../../../bot');
const sendMessage = require('../../../functions/sendMessage');
const getMembers = require('../../../functions/getMembers');
const debugMessage = require('../../../functions/debugMessage');
const buildKeyboard = require('../../../functions/buildKeyboard');
const controlButtons = require('../../../functions/controlButtons');

module.exports = [[/(?:^|\s)\/add_crystals\b/, (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        let members = getMembers(msg.chat.id);
        if (members[msg.from.id].userChatData.status !== "administrator" && members[msg.from.id].userChatData.status !== "creator") {
            return;
        }

        let buttons = buildKeyboard(msg.chat.id, `add_crystals.${msg.chat.id}`);

        sendMessage(msg.from.id, "Выбери, кому ты хочешь добавить кристаллов", {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: controlButtons(`add_crystals.${msg.chat.id}`, buttons, 1)
            }
        });
    } catch (e) {
        debugMessage(`Command: /add_crystals\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];