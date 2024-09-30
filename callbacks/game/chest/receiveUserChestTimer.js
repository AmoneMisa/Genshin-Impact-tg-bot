import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getSession from '../../../functions/getters/getSession.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import getUserName from '../../../functions/getters/getUserName.js';

export default [[/^receive_chest_timer\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    const [, chatId, userId] = callback.data.match(/^receive_chest_timer\.([\-0-9]+)\.([0-9]+)$/);
    let targetSession = await getSession(chatId, userId);
    targetSession.chestCounter = 0;
    targetSession.chosenChests = [];
    targetSession.chestButtons = [];
    targetSession.chestTries = 1;
    return sendMessage(callback.message.chat.id, `Таймер сундука для ${getUserName(targetSession, "name")} обнулён.`, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
    });
}], [/^receive_chest_timer\.([\-0-9]+)_([^.]+)$/, function (session, callback, [, chatId, page]) {
    page = parseInt(page);

    let buttons = buildKeyboard(chatId, `receive_chest_timer.${chatId}`);

    return editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`receive_chest_timer.${chatId}`, buttons, page)
            ]
        }
    });
}]];