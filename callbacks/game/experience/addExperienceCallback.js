import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import editMessageText from '../../../functions/tgBotFunctions/editMessageText.js';
import getSession from '../../../functions/getters/getSession.js';
import setLevel from '../../../functions/game/player/setLevel.js';
import bot from '../../../bot.js';
import controlButtons from '../../../functions/keyboard/controlButtons.js';
import buildKeyboard from '../../../functions/keyboard/buildKeyboard.js';
import getUserName from '../../../functions/getters/getUserName.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import loadPlayer from '../../../functions/getters/loadPlayer.js';

export default [[/^add_experience\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback, [, chatId, userId]) {
    let targetSession = await getSession(chatId, userId);
    sendMessage(callback.message.chat.id, `Сколько опыта добавить для ${await getUserName(targetSession, "name")}?`, {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, async (replyMsg) => {
            bot.removeReplyListener(id);
            let exp = parseInt(replyMsg.text);
            const { chat, member } = await loadPlayer(chatId, userId);
            member.game.stats.currentExp += exp;
            setLevel(member);
            await chat.save();

            deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            deleteMessage(msg.chat.id, msg.message_id);
            return sendMessage(callback.message.chat.id, `Ты добавил ${exp} опыта для ${await getUserName(targetSession, "name")}.`, {
                ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
                disable_notification: true
            });
        })
    })
}], [/^add_experience\.([\-0-9]+)_([^.]+)$/, function (session, callback, [, chatId, page]) {
    page = parseInt(page);

    let buttons = buildKeyboard(chatId, `add_experience.${chatId}`);

    return editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`add_experience.${chatId}`, buttons, page)
            ]
        }
    });
}]];