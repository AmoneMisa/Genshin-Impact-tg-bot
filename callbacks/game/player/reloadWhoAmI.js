const getUserName = require('../../../functions/getters/getUserName');
const getSession = require('../../../functions/getters/getSession');
const editMessageText = require('../../../functions/tgBotFunctions/editMessageText');
const userGetStats = require("../../../functions/game/player/userGetStats");
const buttonsDictionary = require("../../../dictionaries/buttons");

module.exports = [[/^player\.[\-0-9]+\.reload$/, async function (session, callback) {
    if (!callback.message.text.includes(getUserName(session, "nickname"))) {
        return;
    }

    const [, userId] = callback.data.match(/^player\.([\-0-9]+)\.reload/);
    const foundedSession = await getSession(userId, callback.from.id);
    let newMessage = userGetStats(foundedSession);

    if (callback.message.text === newMessage) {
        return;
    }

    return editMessageText(newMessage, {
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
    });

}]];

