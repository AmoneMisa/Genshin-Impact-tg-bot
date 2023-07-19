const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const buttonsDictionary = require('../../../dictionaries/buttons');
const userGetStats = require('../../../functions/game/player/userGetStats');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/whoami\b/, async (msg, session) => {
    deleteMessage(msg.chat.id, msg.message_id);
    await sendMessage(msg.from.id, `${userGetStats(session)}`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Выбрать класс",
                callback_data: `player.${msg.chat.id}.changeClass`
            }], [{
                text: "Показать инвентарь",
                callback_data: `player.${msg.chat.id}.inventory`
            }], [{
                text: "Мои здания",
                callback_data: `player.${msg.chat.id}.builds`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}]];