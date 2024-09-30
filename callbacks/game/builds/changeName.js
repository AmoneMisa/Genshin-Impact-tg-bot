import getBuild from '../../../functions/game/builds/getBuild.js';
import bot from '../../../bot.js';
import getCaption from '../../../functions/game/builds/getCaption.js';
import buttonsDictionary from '../../../dictionaries/buttons.js';
import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import sendMessage from '../../../functions/tgBotFunctions/sendMessage.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import getSession from '../../../functions/getters/getSession.js';
import editMessageCaption from '../../../functions/tgBotFunctions/editMessageCaption.js';

export default [[/^builds\.([\-0-9]+)\.([^.]+)\.changeName$/, async function (session, callback, [, chatId, buildName]) {
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    let foundedSession = await getSession(chatId, callback.from.id);

    if (!foundedSession.game.builds[buildName].canChangeName) {
        return sendMessageWithDelete(callback.message.chat.id, "У тебя нет карточки для смены названия. Чтобы её купить, зайди в магазин: /shop", {
            ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
        }, 5 * 1000);
    }

    await editMessageCaption(getCaption(buildName, "changeName", build), {
        chat_id: callback.message.chat.id,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [[{
                text: "Подтвердить смену",
                callback_data: `builds.${chatId}.${buildName}.changeName.0`
            }], [{
                text: "Назад",
                callback_data: `builds.${chatId}.${buildName}.back`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    }, callback.message.photo);
}], [/^builds\.([\-0-9]+)\.([^.]+)\.changeName\.0$/, async function (session, callback, [, chatId, buildName]) {
    let messageId = callback.message.message_id;
    let build = await getBuild(chatId, callback.from.id, buildName);
    let foundedSession = await getSession(chatId, callback.from.id);

    sendMessage(callback.message.chat.id, getCaption(buildName, "changeName.0", build), {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {}),
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            foundedSession.game.builds[buildName].customName = replyMsg.text;
            deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            deleteMessage(msg.chat.id, msg.message_id);

            editMessageCaption(`Ты успешно сменил название для здания! Новое название: ${foundedSession.game.builds[buildName].customName}`, {
                chat_id: callback.message.chat.id,
                message_id: messageId,
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{
                        text: "Назад",
                        callback_data: `builds.${chatId}.${buildName}.back`
                    }], [{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
                }
            }, callback.message.photo)
        });
    }).catch(e => {
        console.error(e);
    });

    foundedSession.game.builds.palace.canChangeName = false;
}]];