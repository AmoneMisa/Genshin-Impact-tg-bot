const bot = require('../../../bot');
const debugMessage = require('../../../functions/tgBotFunctions/debugMessage');
const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const userGetStats = require('../../../functions/game/player/userGetStats');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/whoami\b/, async (msg, session) => {
    try {
        deleteMessage(msg.chat.id, msg.message_id);

        sendMessage(msg.from.id, `${userGetStats(session)}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Выбрать класс",
                    callback_data: "player.changeClass"
                }], [{
                    text: "Показать инвентарь",
                    callback_data: "player.inventory"
                }], [{
                    text: "Мои здания",
                    callback_data: "player.builds"
                }], [{
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