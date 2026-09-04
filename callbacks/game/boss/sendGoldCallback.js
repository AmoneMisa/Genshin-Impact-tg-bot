import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import bot from '../../../bot.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import { transferGoldInChat } from '../../../functions/game/gold/transferGold.js';

function transferErrorText(reason) {
    if (reason === 'invalid_amount') {
        return 'Нужно ввести целое положительное число без дополнительных символов.';
    }
    if (reason === 'not_enough_gold') {
        return 'У тебя столько нет. Посмотреть количество золота можно командой /whoami > Инвентарь.';
    }
    if (reason === 'self_transfer') {
        return 'Нельзя переводить золото самому себе.';
    }
    return 'Не удалось найти получателя в этом чате.';
}

export default [[/^sendGoldRecipient\.([\-0-9]+)\.([^.]+)$/, async function (session, callback, [, chatId, recipientId]) {
    const { chat } = await loadPlayer(chatId, callback.from.id);
    const recipient = chat.members.find(member => member.userId?.toString() === recipientId.toString());

    if (!recipient || recipient.isHided || String(recipientId) === String(callback.from.id)) {
        await sendMessageWithDelete(callback.message.chat.id, 'Не удалось выбрать получателя для перевода.', {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 10 * 1000);
        return;
    }

    sendMessage(callback.message.chat.id, 'Сколько хочешь передать? Можно вводить только целые положительные числа.', {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, async (replyMsg) => {
            bot.removeReplyListener(id);

            const { chat: freshChat } = await loadPlayer(chatId, callback.from.id);
            const result = transferGoldInChat(freshChat, callback.from.id, recipientId, replyMsg.text);

            if (!result.ok) {
                await sendMessageWithDelete(callback.message.chat.id, transferErrorText(result.reason), {
                    ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
                }, 10 * 1000);
                return;
            }

            await freshChat.save();

            await sendMessageWithDelete(msg.chat.id, `Ты успешно перевёл ${result.amount} золота. Посмотреть количество золота можно командой /whoami > Инвентарь.`, {
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
    let buttons = await buildKeyboard(chatId, `sendGoldRecipient.${chatId}`, false, callback.from.id);

    await editMessageText('Выбери интересующего тебя участника', {
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