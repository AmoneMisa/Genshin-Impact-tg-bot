import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import getUserName from '../../../functions/getters/getUserName.js';

export default [[/^receive_title_timer\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback, [, chatId, userId]) {
    let { chat, member } = await loadPlayer(chatId, userId);
    member.timerTitleCallback = 0;
    await chat.save();
    return sendMessage(callback.message.chat.id, `Таймер титула для ${await getUserName(member, "name")} обнулён.`, {
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