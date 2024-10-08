import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import bot from '../../../bot.js';
import getSession from '../../../functions/getters/getSession.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';

export default [[/^sendGoldRecipient\.([\-0-9]+)\.([^.]+)$/, async function (session, callback, [, chatId, recipientId]) {
    const foundSession = await getSession(chatId, callback.from.id);
    const recipient = await getSession(chatId, recipientId);

    sendMessage(callback.message.chat.id, `Сколько хочешь передать? Можно вводить только цифры и целочисленные значения.`, {
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

            if (foundSession.game.inventory.gold < gold) {
                await sendMessageWithDelete(callback.message.chat.id, `У тебя столько нет. Посмотреть количество золота можно командой /whoami > Инвентарь.`, {
                    ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
                },10 * 1000);
                return;
            }

            recipient.game.inventory.gold += gold;
            foundSession.game.inventory.gold -= gold;

           await sendMessageWithDelete(msg.chat.id, `Ты успешно перевёл ${gold} золота. Посмотреть количество золота можно командой /whoami > Инвентарь.`, {
               ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
               disable_notification: true
           }, 30 * 1000);

            await deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            await deleteMessage(callback.message.chat.id, msg.message_id);
        });
    }).catch(e => {
        console.error(e);
    });
}], [/^sendGoldRecipient\.([\-0-9]+)_([^.]+)$/, async function (session, callback, [, chatId, page]) {
    page = parseInt(page);
    let buttons = buildKeyboard(chatId, `sendGoldRecipient.${chatId}`, false, callback.from.id);

    await editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`sendGoldRecipient.${chatId}`, buttons, page)
            ]
        }
    });
}]];