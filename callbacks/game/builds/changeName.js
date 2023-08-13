const getBuild = require("../../../functions/game/builds/getBuild");
const bot = require("../../../bot");
const getCaption = require("../../../functions/game/builds/getCaption");
const buttonsDictionary = require("../../../dictionaries/buttons");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const getSession = require("../../../functions/getters/getSession");
const editMessageCaption = require('../../../functions/tgBotFunctions/editMessageCaption');

module.exports = [[/^builds\.([\-0-9]+)\.([^.]+)\.changeName$/, async function (session, callback, [, chatId, buildName]) {
    let messageId = callback.message.message_id;

    let build = await getBuild(chatId, callback.from.id, buildName);
    let foundedSession = await getSession(chatId, callback.from.id);

    if (!foundedSession.game.builds[buildName].canChangeName) {
        return sendMessageWithDelete(callback.message.chat.id, "У тебя нет карточки для смены названия. Чтобы её купить, зайди в магазин: /shop", {}, 5 * 1000);
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