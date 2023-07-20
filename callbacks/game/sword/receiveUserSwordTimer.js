const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const editMessageText = require("../../../functions/tgBotFunctions/editMessageText");
const getSession = require("../../../functions/getters/getSession");
const controlButtons = require('../../../functions/keyboard/controlButtons');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const getUserName = require('../../../functions/getters/getUserName');

module.exports = [[/^receive_sword_timer\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
        const [, chatId, userId] = callback.data.match(/^receive_sword_timer\.([\-0-9]+)\.([0-9]+)$/);
        let targetSession = await getSession(chatId, userId);
        targetSession.timerSwordCallback = 0;
        return sendMessage(callback.message.chat.id, `Таймер меча для ${getUserName(targetSession, "name")} обнулён.`);
}], [/^receive_sword_timer\.([\-0-9]+)_([^.]+)$/, function (session, callback) {
    let [, chatId, page] = callback.data.match(/^receive_sword_timer\.([\-0-9]+)_([^.]+)$/);
    page = parseInt(page);

    let buttons = buildKeyboard(chatId, `receive_sword_timer.${chatId}`);

    return editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`receive_sword_timer.${chatId}`, buttons, page)
            ]
        }
    });
}]];