const bot = require('../bot');
const debugMessage = require('../functions/tgBotFunctions/debugMessage');
const dictionary = require('../dictionaries/main');
const buttonsDictionary = require('../dictionaries/buttons');
const sendMessage = require('../functions/tgBotFunctions/sendMessage');

module.exports = [[/(?:^|\s)\/help\b/, async (msg) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
        sendMessage(msg.chat.id, `${dictionary["ru"].help.main}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Миниигры",
                    callback_data: "help_minigames"
                }, {
                    text: "Босс",
                    callback_data: "help_boss"
                }], [{
                    text: "Команда mute",
                    callback_data: "help_mute"
                }, {
                    text: "Команда form",
                    callback_data: "help_form"
                }], [{
                    text: "Админ команды",
                    callback_data: "help_admin"
                }, {
                    text: "Связь с разработчиком",
                    callback_data: "help_contact"
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        debugMessage(`Command: /help\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];