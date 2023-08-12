const getSession = require("../../../functions/getters/getSession");
const editMessageCaption = require("../../../functions/tgBotFunctions/editMessageCaption");
const buttonsDictionary = require("../../../dictionaries/buttons");
const userGetStats = require("../../../functions/game/player/userGetStats");

module.exports = [[/^player\.([\-0-9]+)\.whoami$/, async function (session, callback, [, userId]) {
    const foundedSession = await getSession(userId, callback.from.id);
    let newMessage = userGetStats(foundedSession);

    if (callback?.message?.text?.trim() === newMessage.trim() || callback?.message?.caption?.trim() === newMessage.trim()) {
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
            }],[{
                text: "Состояние персонажа",
                callback_data: `player.${userId}.character`
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