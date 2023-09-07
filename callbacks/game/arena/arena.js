const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const editMessageText = require("../../../functions/tgBotFunctions/editMessageText");
const getSession = require("../../../functions/getters/getSession");
const bot = require('../../../bot');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const getDefenderDataString = require("../../../functions/game/arena/getDefenderDataString");
const getPlayerRating = require("../../../functions/game/arena/getPlayerRating");

module.exports = [[/^arena\.common\.([\-0-9]+)$/, async function (session, callback, [, chatId]) {
    let buttons = buildKeyboard(chatId, `arena.common.${chatId}`);

    await sendMessage(callback.message.chat.id, `(Обычная арена) Список соперников:`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`arena.common.${chatId}`, buttons, 1)
            ]
        }
    });
}], [/^arena\.expansion\.([\-0-9]+)$/, async function (session, callback, [, chatId]) {
    let buttons = buildKeyboard(chatId, `arena.expansion.${chatId}`);

    await sendMessage(callback.message.chat.id, `(Мировая арена) Список соперников:`, {
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`arena.expansion.${chatId}`, buttons, 1)
            ]
        }
    });
}], [/^arena\.(\w+)\.([\-0-9]+)_([^.]+)$/, async function (session, callback, [, arenaType, chatId, page]) {
    page = parseInt(page);

    let buttons = buildKeyboard(chatId, `arena.${arenaType}.${chatId}`);

    await bot.editMessageReplyMarkup({
        inline_keyboard: [
            ...controlButtons(`arena.${arenaType}.${chatId}`, buttons, page)
        ]
    }, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true
    });
}], [/^arena\.(\w+)\.([\-0-9]+)\.([0-9])$/, async function (session, callback, [, arenaType, chatId, defenderId]) {
    let defender = await getSession(chatId, defenderId);

    await editMessageText(getDefenderDataString(defender), {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Атаковать",
                callback_data: `arena.${arenaType}.${chatId}.${defenderId}.attack`
            }], [{
                text: "Назад",
                callback_data: `arena.${arenaType}.${chatId}`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], [/^arena\.(\w+)\.([\-0-9]+)\.([0-9])$/, async function (session, callback, [, arenaType, chatId, defenderId]) {
    let defender = await getSession(chatId, defenderId);

    await editMessageText(`Рейтинг: ${getPlayerRating(defenderId, arenaType, chatId)}\n\n${getDefenderDataString(defender)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Атаковать",
                callback_data: `arena.${arenaType}.${chatId}.${defenderId}.attack`
            }], [{
                text: "Назад",
                callback_data: `arena.${arenaType}.${chatId}`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], [/^arena\.(\w+)\.([\-0-9]+)\.([0-9])\.0$/, async function (session, callback, [, arenaType, chatId, defenderId]) {
    let defender = await getSession(chatId, defenderId);

    await editMessageText(`Рейтинг: ${getPlayerRating(defenderId, arenaType, chatId)}\n\n${getDefenderDataString(defender)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Список противников",
                callback_data: `arena.${arenaType}.${chatId}`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}]];