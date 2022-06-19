const sendMessage = require("../../../functions/sendMessage");
const getSession = require("../../../functions/getSession");
const bot = require('../../../bot');
const controlButtons = require('../../../functions/controlButtons');
const buildKeyboard = require('../../../functions/buildKeyboard');

module.exports = [[/^add_gold\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    try {
        const [, chatId, userId] = callback.data.match(/^add_gold\.([\-0-9]+)\.([0-9]+)$/);
        let targetSession = await getSession(chatId, userId);
        sendMessage(callback.message.chat.id, `Сколько золота добавить для ${targetSession.userChatData.user.first_name}?`, {
            disable_notification: true,
            reply_markup: {
                selective: true,
                force_reply: true
            }
        }).then((msg) => {
            let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
                bot.removeReplyListener(id);
                let gold = parseInt(replyMsg.text);
                targetSession.game.inventory.gold += gold;

                bot.deleteMessage(replyMsg.chat.id, replyMsg.message_id);
                bot.deleteMessage(msg.chat.id, msg.message_id);
                return sendMessage(callback.message.chat.id, `Ты добавил ${gold} золота для ${targetSession.userChatData.user.first_name}.`, {
                    disable_notification: true
                });
            });
        }).catch(e => {
            console.error(e);
        });
    } catch (e) {
        console.error(e);
    }
}], [/^add_gold\.([\-0-9]+)_([^.]+)$/, function (session, callback) {
    let [, chatId, page] = callback.data.match(/^add_gold\.([\-0-9]+)_([^.]+)$/);
    console.log(chatId, page);
    page = parseInt(page);

    let buttons = buildKeyboard(chatId, `add_gold.${chatId}`);

    return bot.editMessageText(`Выбери интересующего тебя участника`, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [
                ...controlButtons(`add_gold.${chatId}`, buttons, page)
            ]
        }
    });
}]];