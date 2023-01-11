const bot = require('../../bot');
const debugMessage = require('../../functions/tgBotFunctions/debugMessage');
const sendMessage = require('../../functions/tgBotFunctions/sendMessage');

module.exports = [[/(?:^|\s)\/remove_keyboard/, async (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        sendMessage(msg.chat.id, "Клавиатура убрана.", {
            reply_markup: JSON.stringify({
                remove_keyboard: true
            })
        }).then(message => {
            setTimeout(() => bot.deleteMessage(msg.chat.id, message.message_id), 5000);
        })

    } catch (e) {
        debugMessage(`Command: /remove_keyboard\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];