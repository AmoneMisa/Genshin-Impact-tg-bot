const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const getSession = require("../../../functions/getters/getSession");
const getMembers = require("../../../functions/getters/getMembers");
const controlButtons = require('../../../functions/keyboard/controlButtons');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const getUserName = require('../../../functions/getters/getUserName');
const updatePlayerStats = require('../../../functions/game/player/updatePlayerStats');
const editMessageText = require('../../../functions/tgBotFunctions/editMessageText');

module.exports = [[/^update_characteristics\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback, [, chatId, userId]) {
    let targetSession = await getSession(chatId, userId);
    updatePlayerStats(targetSession);

    sendMessage(callback.message.chat.id, `Ты пересчитал характеристики для ${getUserName(targetSession, "name")}. Пожалуйста, проверьте их через /whoami`, {
        disable_notification: true
    }).catch(e => {
        console.error(e);
    });
}], [/^update_characteristics\.([\-0-9]+)\.all$/, async function (session, callback, [, chatId]) {
    let targetMembers = getMembers(chatId);
    let filteredMembers = Object.values(targetMembers).filter(member => !member.userChatData.user.is_bot);

    for (let member of filteredMembers) {
        updatePlayerStats(member);
    }

    sendMessage(callback.message.chat.id, `Ты пересчитал характеристики для всей группы. Пожалуйста, проверьте их через /whoami`, {
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