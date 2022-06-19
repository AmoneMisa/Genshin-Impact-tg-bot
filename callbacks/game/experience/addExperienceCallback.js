const sendMessage = require("../../../functions/sendMessage");
const debugMessage = require("../../../functions/debugMessage");
const getSession = require("../../../functions/getSession");
const setLevel = require('../../../functions/game/player/setLevel');
const bot = require('../../../bot');

module.exports = [[/^add_experience\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    try {
        const [, chatId, userId] = callback.data.match(/^add_experience\.([\-0-9]+)\.([0-9]+)$/);
        let targetSession = await getSession(chatId, userId);
        sendMessage(callback.message.chat.id, `Сколько опыта добавить для ${targetSession.userChatData.user.first_name}?`, {
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

                bot.deleteMessage(replyMsg.chat.id, replyMsg.message_id);
                bot.deleteMessage(msg.chat.id, msg.message_id);
                setLevel(targetSession);
                return sendMessage(callback.message.chat.id, `Ты добавил ${exp} опыта для ${targetSession.userChatData.user.first_name}.`, {
                    disable_notification: true
                });
            })
        })
    } catch(e){
        debugMessage(`Command: add_experience - callback\nIn: ${callback.message.chat.id} - ${callback.message.chat.title}\n\nError: ${e}`);
        throw e;
    }
}], [/^add_experience_[^.]+$/, function (session, callback) {
    let [, page] = callback.data.match(/^add_experience_([^.]+)$/);
    page = parseInt(page);

    let buttons = buildKeyboard(callback.message.chat.id, 'add_experience');

    return bot.editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons("add_experience", buttons, page)
            ]
        }
    });
}]];