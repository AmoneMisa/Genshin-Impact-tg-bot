import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getSession from '../../../functions/getters/getSession.js';
import bot from '../../../bot.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';

export default [[/^add_steal_chance\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
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