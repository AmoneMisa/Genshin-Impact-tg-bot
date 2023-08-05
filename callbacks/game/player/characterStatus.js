const getSession = require('../../../functions/getters/getSession');
const buttonsDictionary = require("../../../dictionaries/buttons");
const editMessageCaption = require("../../../functions/tgBotFunctions/editMessageCaption");
const getEquipmentStatsMessage = require("../../../functions/game/player/getEquipmentStatsMessage");

module.exports = [[/^player\.([\-0-9]+)\.character$/, async function (session, callback, [, userId]) {
    const foundedSession = await getSession(userId, callback.from.id);

    await editMessageCaption(getEquipmentStatsMessage(foundedSession), {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Назад",
                callback_data: `player.${userId}.whoami`
            }],[{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo).catch(e => console.error(e));
}]];