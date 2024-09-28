const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const getSession = require("../../../functions/getters/getSession");
const bot = require('../../../bot');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const editMessageText = require('../../../functions/tgBotFunctions/editMessageText');

module.exports = [[/^add_steal_chance\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    const [, chatId, userId] = callback.data.match(/^add_steal_chance\.([\-0-9]+)\.([0-9]+)$/);
    let targetSession = await getSession(chatId, userId);
    sendMessage(callback.message.chat.id, `Сколько попыток грабежа добавить для ${getUserName(targetSession, "name")}?`, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            let chanceToSteal = parseInt(replyMsg.text);
            targetSession.game.chanceToSteal += chanceToSteal;

            deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            deleteMessage(msg.chat.id, msg.message_id);
            sendMessage(callback.message.chat.id, `Ты добавил ${chanceToSteal} попыток грабежа для ${getUserName(targetSession, "name")}.`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                disable_notification: true
            });
        });
    }).catch(e => {
        console.error(e);
    });
}], [/^add_steal_chance\.([\-0-9]+)_([^.]+)$/, async function (session, callback) {
    let [, chatId, page] = callback.data.match(/^add_steal_chance\.([\-0-9]+)_([^.]+)$/);
    page = parseInt(page);

    let buttons = buildKeyboard(chatId, `add_steal_chance.${chatId}`);

    await editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`add_steal_chance.${chatId}`, buttons, page)
            ]
        }
    });
}]];