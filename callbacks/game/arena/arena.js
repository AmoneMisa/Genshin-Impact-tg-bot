const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const editMessageText = require("../../../functions/tgBotFunctions/editMessageText");
const getSession = require("../../../functions/getters/getSession");
const setLevel = require('../../../functions/game/player/setLevel');
const bot = require('../../../bot');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/^arena\.common\.([\-0-9]+)$/, async function (session, callback, [, chatId]) {
    let targetSession = await getSession(chatId, userId);
    sendMessage(callback.message.chat.id, `Список соперников:`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            let exp = parseInt(replyMsg.text);
            targetSession.game.stats.currentExp += exp;

            deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            deleteMessage(msg.chat.id, msg.message_id);
            setLevel(targetSession);
            return sendMessage(callback.message.chat.id, `Ты добавил ${exp} опыта для ${getUserName(targetSession, "name")}.`, {
                disable_notification: true
            });
        })
    })
}], [/^arena\.expansion\.([\-0-9]+)$/, async function (session, callback, [, chatId]) {
    let targetSession = await getSession(chatId, userId);
    sendMessage(callback.message.chat.id, `(Мировая арена) Список соперников:`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            let exp = parseInt(replyMsg.text);
            targetSession.game.stats.currentExp += exp;

            deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            deleteMessage(msg.chat.id, msg.message_id);
            setLevel(targetSession);
            return sendMessage(callback.message.chat.id, `Ты добавил ${exp} опыта для ${getUserName(targetSession, "name")}.`, {
                disable_notification: true
            });
        })
    })
}], [/^arena\.(\w+)\.([\-0-9]+)_([^.]+)$/, function (session, callback, [, arenaType, chatId, page]) {
    page = parseInt(page);

    let buttons = buildKeyboard(chatId, `arena.${arenaType}.${chatId}`);

    return editMessageText(`Список соперников:`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`arena.${arenaType}.${chatId}`, buttons, page)
            ]
        }
    });
}]];