const getBuild = require("../../../functions/game/builds/getBuild");
const bot = require("../../../bot");
const getCaption = require("../../../functions/game/builds/getCaption");
const buttonsDictionary = require("../../../dictionaries/buttons");
const sendMessageWithDelete = require("../../../functions/tgBotFunctions/sendMessageWithDelete");
const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/^builds\.[^.]+\.changeName$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.changeName$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    if (!session.game.builds[buildName].canChangeName) {
        return sendMessageWithDelete(chatId, "У тебя нет карточки для смены названия. Чтобы её получить, зайди в магазин: /shop", {}, 5 * 1000);
    }

    await bot.editMessageCaption(getCaption(buildName, "changeName", build), {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
            inline_keyboard: [[{
                text: "Подтвердить смену",
                callback_data: `builds.${buildName}.changeName.0`
            }], [{
                text: "Назад",
                callback_data: `builds.${buildName}.back`
            }], [{
                text: buttonsDictionary["ru"].close,
                callback_data: "close"
            }]]
        }
    });
}], [/^builds\.[^.]+\.changeName\.0$/, async function (session, callback) {
    const [, buildName] = callback.data.match(/^builds\.([^.]+)\.changeName\.0$/);
    let messageId = callback.message.message_id;
    let chatId = callback.message.chat.id;

    let build = await getBuild(chatId, callback.from.id, buildName);

    sendMessage(chatId, getCaption(buildName, "changeName.0", build), {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            session.game.builds[buildName].customName = replyMsg.text;
            deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            deleteMessage(msg.chat.id, msg.message_id);

            bot.editMessageCaption(`Ты успешно сменил название для здания! Новое название: ${session.game.builds[buildName].customName}`, {
                chat_id: chatId,
                message_id: messageId,
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: [[{
                        text: "Назад",
                        callback_data: `builds.${buildName}.back`
                    }], [{
                        text: buttonsDictionary["ru"].close,
                        callback_data: "close"
                    }]]
                }
            })
        });
    }).catch(e => {
        console.error(e);
    });

    session.game.builds.palace.canChangeName = false;
}]];