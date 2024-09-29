const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const editMessageText = require("../../../functions/tgBotFunctions/editMessageText");
const getSession = require("../../../functions/getters/getSession");
const controlButtons = require('../../../functions/keyboard/controlButtons');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const getUserName = require('../../../functions/getters/getUserName');

module.exports = [[/^receive_title_timer\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback, [, chatId, userId]) {
    let targetSession = await getSession(chatId, userId);
    targetSession.timerTitleCallback = 0;
    return sendMessage(callback.message.chat.id, `Таймер титула для ${getUserName(targetSession, "name")} обнулён.`, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
    });
}], [/^receive_title_timer\.([\-0-9]+)_([^.]+)$/, function (session, callback, [, chatId, page]) {
    page = parseInt(page);

    let buttons = buildKeyboard(chatId, `receive_title_timer.${chatId}`);

    return editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`receive_title_timer.${chatId}`, buttons, page)
            ]
        }
    });
}]];