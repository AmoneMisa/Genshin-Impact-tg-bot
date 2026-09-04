import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';
import getChatSession from '../../../functions/getters/getChatSession.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import getUserName from '../../../functions/getters/getUserName.js';
import updatePlayerStats from '../../../functions/game/player/updatePlayerStats.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';

export default [[/^update_characteristics\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback, [, chatId, userId]) {
    let { chat, member } = await loadPlayer(chatId, userId);
    updatePlayerStats(member);
    await chat.save();

    sendMessage(callback.message.chat.id, `Ты пересчитал характеристики для ${await getUserName(member, "name")}. Пожалуйста, проверьте их через /whoami`, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        disable_notification: true
    }).catch(e => {
        console.error(e);
    });
}], [/^update_characteristics\.([\-0-9]+)\.all$/, async function (session, callback, [, chatId]) {
    let chat = await getChatSession(chatId);
    let filteredMembers = chat.members.filter(member => !member.userChatData?.user?.is_bot && !member.isHided);

    for (let member of filteredMembers) {
        updatePlayerStats(member);
    }

    await chat.save();

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