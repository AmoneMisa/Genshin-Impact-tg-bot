import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import getSession from '../../../functions/getters/getSession.js';
import bot from '../../../bot.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import getChatSession from "../../../functions/getters/getChatSession.js";

export default [[/^add_gold\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback, [, chatId, userId]) {
    let targetSession = await getSession(chatId, userId);
    let chat = await getChatSession(chatId);
    sendMessage(callback.message.chat.id, `Сколько золота добавить для ${await getUserName(targetSession, "name")}?`, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, async (replyMsg) => {
            bot.removeReplyListener(id);
            let gold = parseInt(replyMsg.text);
            targetSession.game.inventory.gold += gold;
            console.log(gold);
            console.log(targetSession);
            chat.save();
            deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            deleteMessage(msg.chat.id, msg.message_id);
            return sendMessage(callback.message.chat.id, `Ты добавил ${gold} золота для ${await getUserName(targetSession, "name")}.`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                disable_notification: true
            });
        });
    }).catch(e => {
        console.error(e);
    });

}], [/^add_gold\.([\-0-9]+)_([^.]+)$/, async function (session, callback, [, chatId, page]) {
    page = parseInt(page);

    let buttons = await buildKeyboard(chatId, `add_gold.${chatId}`);

    return editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`add_gold.${chatId}`, buttons, page)
            ]
        }
    });
}]];