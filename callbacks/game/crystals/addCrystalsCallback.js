const sendMessage = require("../../../functions/sendMessage");
const getSession = require("../../../functions/getSession");
const bot = require('../../../bot');

module.exports = [[/^add_crystals\.([\-0-9]+)\.([0-9]+)$/, async function (session, callback) {
    try {
        const [, chatId, userId] = callback.data.match(/^add_crystals\.([\-0-9]+)\.([0-9]+)$/);
        let targetSession = await getSession(chatId, userId);
        sendMessage(callback.message.chat.id, `Сколько кристаллов добавить для ${targetSession.userChatData.user.first_name}?`, {
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

                bot.deleteMessage(replyMsg.chat.id, replyMsg.message_id);
                bot.deleteMessage(msg.chat.id, msg.message_id);
                return sendMessage(callback.message.chat.id, `Ты добавил ${crystals} кристаллов для ${targetSession.userChatData.user.first_name}.`, {
                    disable_notification: true
                });
            });
        }).catch(e => {
            console.error(e);
        });
    } catch (e) {
        console.error(e);
    }
}]];