const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const editMessageText = require("../../../functions/tgBotFunctions/editMessageText");
const getSession = require("../../../functions/getters/getSession");
const bot = require('../../../bot');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const getDefenderDataString = require("../../../functions/game/arena/getDefenderDataString");
const getPlayerRating = require("../../../functions/game/arena/getPlayerRating");
const getBattleResult = require("../../../functions/game/arena/getBattleResult");
const calculatePoints = require("../../../functions/game/arena/calculatePoints");
const setPlayerRating = require("../../../functions/game/arena/setPlayerRating");

module.exports = [[/^arena\.common\.([\-0-9]+)(?:\.back)?$/, async function (session, callback, [, chatId]) {
    let buttons = buildKeyboard(chatId, `arena.common.${chatId}`, false, callback.from.id);
    const isBack = callback.data.includes("back");

    if (isBack) {
        await editMessageText(`(Обычная арена) Список соперников:`, {
            disable_notification: true,
            chat_id: callback.message.chat.id,
            message_id: callback.message.id,
            reply_markup: {
                inline_keyboard: [
                    ...controlButtons(`arena.common.${chatId}`, buttons, 1)
                ]
            }
        });
    } else {
        await sendMessage(callback.message.chat.id, `(Обычная арена) Список соперников:`, {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [
                    ...controlButtons(`arena.common.${chatId}`, buttons, 1)
                ]
            }
        });
    }
}], [/^arena\.expansion\.([\-0-9]+)(?:\.back)?$/, async function (session, callback, [, chatId]) {
    let buttons = buildKeyboard(chatId, `arena.expansion.${chatId}`);
    const isBack = callback.data.includes("back");

    if (isBack) {
        await editMessageText("(Мировая арена) Список соперников:", {
            disable_notification: true,
            chat_id: callback.message.chat.id,
            message_id: callback.message.id,
            reply_markup: {
                inline_keyboard: [
                    ...controlButtons(`arena.expansion.${chatId}`, buttons, 1)
                ]
            }
        });
    } else {
        await sendMessage(callback.message.chat.id, "(Мировая арена) Список соперников:", {
            disable_notification: true,
            reply_markup: {
                inline_keyboard: [
                    ...controlButtons(`arena.expansion.${chatId}`, buttons, 1)
                ]
            }
        });
    }
}], [/^arena\.(\w+)\.([\-0-9]+)_([^.]+)$/, async function (session, callback, [, arenaType, chatId, page]) {
    page = parseInt(page);

    let buttons = buildKeyboard(chatId, `arena.${arenaType}.${chatId}`, false, callback.from.id);

    await bot.editMessageReplyMarkup({
        inline_keyboard: [
            ...controlButtons(`arena.${arenaType}.${chatId}`, buttons, page)
        ]
    }, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true
    });
}], [/^arena\.(\w+)\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback, [, arenaType, chatId, defenderId]) {
    let defender = await getSession(chatId, defenderId);

    await editMessageText(`Рейтинг: ${getPlayerRating(defenderId, arenaType, chatId)[0].rating}\n\n${getDefenderDataString(defender)}`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Атаковать",
                callback_data: `arena.${arenaType}.${chatId}.${defenderId}.0`
            }], [{
                text: "Назад",
                callback_data: `arena.${arenaType}.${chatId}.back`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}], [/^arena\.(\w+)\.([\-0-9]+)\.([0-9]+)\.0$/, async function (session, callback, [, arenaType, chatId, defenderId]) {
    let defender = await getSession(chatId, defenderId);
    let attacker = await getSession(chatId, callback.from.id);
    let battleResult = getBattleResult(attacker, defender);
    let points = calculatePoints(attacker, defender, arenaType, chatId);
    let message = "";

    if (battleResult === 0) {
        message = `Победа!\nТы получил: ${points} очков рейтинга!`;
        setPlayerRating(callback.from.id, arenaType, chatId, points);
    } else if (battleResult === 1) {
        message = `Проигрыш!\nТы потерял: ${points} очков рейтинга.`;
        setPlayerRating(callback.from.id, arenaType, chatId, -points);
    } else if (battleResult === 2) {
        message = "Ничья!\nРейтинг остаётся таким же.";
    }

    await editMessageText(message, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [[{
                text: "Список противников",
                callback_data: `arena.${arenaType}.${chatId}.back`
            }], [{
                text: "Закрыть",
                callback_data: "close"
            }]]
        }
    });
}]];