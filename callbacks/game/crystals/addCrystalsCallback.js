const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const getSession = require("../../../functions/getters/getSession");
const bot = require('../../../bot');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const editMessageText = require("../../../functions/tgBotFunctions/editMessageText");

module.exports = [[/^add_crystals\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    const [, chatId, userId] = callback.data.match(/^add_crystals\.([\-0-9]+)\.([0-9]+)$/);
    let targetSession = await getSession(chatId, userId);
    sendMessage(callback.message.chat.id, `Сколько кристаллов добавить для ${getUserName(targetSession, "name")}?`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            let crystals = parseInt(replyMsg.text);
            targetSession.game.inventory.crystals += crystals;

            deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            deleteMessage(msg.chat.id, msg.message_id);
            return sendMessage(callback.message.chat.id, `Ты добавил ${crystals} кристаллов для ${getUserName(targetSession, "name")}.`, {
                disable_notification: true
            });
        });
    }).catch(e => {
        console.error(e);
    });
}], [/^add_crystals\.([\-0-9]+)_([^.]+)$/, function (session, callback, [, chatId, page]) {
    page = parseInt(page);

    let buttons = buildKeyboard(chatId, `add_crystals.${chatId}`);

    return editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`add_crystals.${chatId}`, buttons, page)
            ]
        }
    });
}]];