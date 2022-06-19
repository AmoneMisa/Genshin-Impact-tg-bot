const sendMessage = require("../../../functions/sendMessage");
const getSession = require("../../../functions/getSession");
const bot = require('../../../bot');

module.exports = [[/^receive_chest_timer\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    try {
        const [, chatId, userId] = callback.data.match(/^receive_chest_timer\.([\-0-9]+)\.([0-9]+)$/);
        let targetSession = await getSession(chatId, userId);
        targetSession.chestCounter = 0;
        targetSession.chosenChests = [];
        targetSession.chestButtons = [];
        targetSession.timerOpenChestCallback = 0;
        sendMessage(callback.message.chat.id, `Таймер сундука для ${targetSession.userChatData.user.first_name} обнулён.`);
    } catch (e) {
        console.error(e);
    }
}], [/^receive_chest_timer_[^.]+$/, function (session, callback) {
    let [, page] = callback.data.match(/^receive_chest_timer_([^.]+)$/);
    page = parseInt(page);

    let buttons = buildKeyboard(callback.message.chat.id, `receive_chest_timer.${callback.message.chat.id}`);

    return bot.editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`receive_chest_timer.${callback.message.chat.id}`, buttons, page)
            ]
        }
    });
}]];