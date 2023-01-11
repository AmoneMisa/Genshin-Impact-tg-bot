const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const getSession = require("../../../functions/getters/getSession");
const bot = require('../../../bot');
const getUserName = require('../../../functions/getters/getUserName');

module.exports = [[/^receive_chest_timer\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    try {
        const [, chatId, userId] = callback.data.match(/^receive_chest_timer\.([\-0-9]+)\.([0-9]+)$/);
        let targetSession = await getSession(chatId, userId);
        targetSession.chestCounter = 0;
        targetSession.chosenChests = [];
        targetSession.chestButtons = [];
        targetSession.timerOpenChestCallback = 0;
        sendMessage(callback.message.chat.id, `Таймер сундука для ${getUserName(targetSession, "name")} обнулён.`);
    } catch (e) {
        console.error(e);
    }
}], [/^receive_chest_timer\.([\-0-9]+)_([^.]+)$/, function (session, callback) {
    let [, chatId, page] = callback.data.match(/^receive_chest_timer\.([\-0-9]+)_([^.]+)$/);
    page = parseInt(page);

    let buttons = buildKeyboard(chatId, `receive_chest_timer.${chatId}`);

    return bot.editMessageText(`Выбери интересующего тебя участника`, {
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