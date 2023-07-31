const getSession = require('../../../functions/getters/getSession');
const userGetStats = require("../../../functions/game/player/userGetStats");
const buttonsDictionary = require("../../../dictionaries/buttons");
const editMessageCaption = require("../../../functions/tgBotFunctions/editMessageCaption");

module.exports = [[/^player\.([\-0-9]+)\.reload$/, async function (session, callback, [, userId]) {
    const foundedSession = await getSession(userId, callback.from.id);
    let newMessage = userGetStats(foundedSession);

    if (callback.message.text === newMessage) {
        return;
    }

    await editMessageCaption(newMessage, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Выбрать класс",
                callback_data: `player.${userId}.changeClass`
            }], [{
                text: "Показать инвентарь",
                callback_data: `player.${userId}.inventory`
            }], [{
                text: "Мои здания",
                callback_data: `player.${userId}.builds`
            }], [{
                text: "Обновить",
                callback_data: `player.${userId}.reload`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo).catch(e => console.error(e));
}]];

