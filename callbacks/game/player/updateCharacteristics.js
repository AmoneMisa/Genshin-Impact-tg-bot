import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getSession from '../../../functions/getters/getSession.js';
import getMembers from '../../../functions/getters/getMembers.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import getUserName from '../../../functions/getters/getUserName.js';
import updatePlayerStats from '../../../functions/game/player/updatePlayerStats.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';

export default [[/^update_characteristics\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback, [, chatId, userId]) {
    let targetSession = await getSession(chatId, userId);
    updatePlayerStats(targetSession);

    sendMessage(callback.message.chat.id, `Ты пересчитал характеристики для ${getUserName(targetSession, "name")}. Пожалуйста, проверьте их через /whoami`, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        disable_notification: true
    }).catch(e => {
        console.error(e);
    });
}], [/^update_characteristics\.([\-0-9]+)\.all$/, async function (session, callback, [, chatId]) {
    let targetMembers = getMembers(chatId);
    let filteredMembers = Object.values(targetMembers).filter(member => !member.userChatData.user.is_bot && !member.isHided);

    for (let member of filteredMembers) {
        updatePlayerStats(member);
    }

    sendMessage(callback.message.chat.id, `Ты пересчитал характеристики для всей группы. Пожалуйста, проверьте их через /whoami`, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        disable_notification: true
    }).catch(e => {
        console.error(e);
    });
}], [/^update_characteristics\.([\-0-9]+)_([^.]+)$/, function (session, callback, [, chatId, page]) {
    page = parseInt(page);
    let buttons = buildKeyboard(chatId, `update_characteristics.${chatId}`);

    return editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`update_characteristics.${chatId}`, buttons, page)
            ]
        }
    });
}]];