const sendMessage = require("../../../functions/tgBotFunctions/sendMessage");
const debugMessage = require("../../../functions/tgBotFunctions/debugMessage");
const getSession = require("../../../functions/getters/getSession");
const setLevel = require('../../../functions/game/player/setLevel');
const bot = require('../../../bot');
const controlButtons = require('../../../functions/keyboard/controlButtons');
const buildKeyboard = require('../../../functions/keyboard/buildKeyboard');
const getUserName = require('../../../functions/getters/getUserName');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/^add_experience\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    try {
        const [, chatId, userId] = callback.data.match(/^add_experience\.([\-0-9]+)\.([0-9]+)$/);
        let targetSession = await getSession(chatId, userId);
        sendMessage(callback.message.chat.id, `Сколько опыта добавить для ${getUserName(targetSession, "name")}?`, {
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
    } catch (e) {
        debugMessage(`Command: add_experience - callback\nIn: ${callback.message.chat.id} - ${callback.message.chat.title}\n\nError: ${e}`);
        throw e;
    }
}], [/^add_experience\.([\-0-9]+)_([^.]+)$/, function (session, callback) {
    let [, chatId, page] = callback.data.match(/^add_experience\.([\-0-9]+)_([^.]+)$/);
    page = parseInt(page);

    let buttons = buildKeyboard(chatId, `add_experience.${chatId}`);

    return bot.editMessageText(`Выбери интересующего тебя участника`, {
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