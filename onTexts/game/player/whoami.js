const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const sendPhoto = require('../../../functions/tgBotFunctions/sendPhoto');
const buttonsDictionary = require('../../../dictionaries/buttons');
const userGetStats = require('../../../functions/game/player/userGetStats');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getFile = require("../../../functions/getters/getFile");

module.exports = [[/(?:^|\s)\/whoami\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let className = session.game.gameClass.stats.name || "noClass";
    let gender = session.gender || "male";

    let file = getFile(`images/classes/${className}/${gender}`, className);

    if (file) {
        return sendPhoto(msg.from.id, file, {
            caption: `${userGetStats(session)}`,
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Выбрать класс",
                    callback_data: `player.${msg.chat.id}.changeClass`
                }], [{
                    text: "Состояние персонажа",
                    callback_data: `player.${msg.chat.id}.character`
                }], [{
                    text: "Показать инвентарь",
                    callback_data: `player.${msg.chat.id}.inventory`
                }], [{
                    text: "Мои здания",
                    callback_data: `player.${msg.chat.id}.builds`
                }], [{
                    text: "Обновить",
                    callback_data: `player.${msg.chat.id}.reload`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    } else {
        await sendMessage(msg.from.id, `${userGetStats(session)}`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [[{
                    text: "Выбрать класс",
                    callback_data: `player.${msg.chat.id}.changeClass`
                }], [{
                    text: "Состояние персонажа",
                    callback_data: `player.${msg.chat.id}.character`
                }], [{
                    text: "Показать инвентарь",
                    callback_data: `player.${msg.chat.id}.inventory`
                }], [{
                    text: "Мои здания",
                    callback_data: `player.${msg.chat.id}.builds`
                }], [{
                    text: "Обновить",
                    callback_data: `player.${msg.chat.id}.reload`
                }], [{
                    text: buttonsDictionary["ru"].close,
                    callback_data: "close"
                }]]
            }
        });
    }
}]];