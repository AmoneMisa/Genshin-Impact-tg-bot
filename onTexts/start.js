const bot = require('../bot');
const buttonsDictionary = require('../dictionaries/buttons');
const sendMessage = require('../functions/tgBotFunctions/sendMessage');
const deleteMessage = require("../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/start/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let commands = await bot.getMyCommands();
    let message = `Список команд бота:\n\n`;
    for (let command of commands) {
        message += `/${command.command} - ${command.description}\n`;
    }

    await sendMessage(msg.chat.id, message, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];