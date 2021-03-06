const bot = require('../bot');
const debugMessage = require('../functions/debugMessage');
const buttonsDictionary = require('../dictionaries/buttons');
const sendMessage = require('../functions/sendMessage');

module.exports = [[/(?:^|\s)\/start/, async (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        let commands = await bot.getMyCommands();
        let message = `Список команд бота:\n\n`;
        for (let command of commands) {
            message += `/${command.command} - ${command.description}\n`;
        }

        sendMessage(msg.chat.id, message, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        debugMessage(`Command: /start\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];