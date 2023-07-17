const bot = require('../../../bot');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const userGetStats = require('../../../functions/game/player/userGetStats');

module.exports = [[/(?:^|\s)\/whoami\b/, async (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.chat.id, `${userGetStats(session)}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } catch (e) {
        debugMessage(`Command: /whoami\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}\nSession - ${JSON.stringify(session.game.inventory)}`);
        throw e;
    }
}]];