const bot = require('../bot');
const {myId} = require('../config');
const buttonsDictionary = require('../dictionaries/buttons');
const {sessions} = require('../data');
const sendMessage = require('../functions/sendMessage');
const getSession = require('../functions/getSession');

module.exports = [[/(?:^|\s)\/start/, async (msg) => {
    try {
        await getSession(sessions, msg.chat.id, msg.from.id);
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
        sendMessage(myId, `Command: /start\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}]];