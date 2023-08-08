const bot = require('../bot');
const sendMessage = require('../functions/tgBotFunctions/sendMessage');
const deleteMessage = require("../functions/tgBotFunctions/deleteMessage");
const getUserName = require("../functions/getters/getUserName");
const getSession = require("../functions/getters/getSession");
const {myId} = require("../config");

module.exports = [[/(?:^|\s)\/feedback/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    let session = await getSession(msg.chat.id, msg.from.id);

    sendMessage(msg.from.id, `${getUserName(session, "name")}, Возникли вопросы? Нашли баг? Есть предложения или пожелания? Можете написать Ваши мысли в ответ к этому сообщению.`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then(message => {
        console.log(message)
        let id = bot.onReplyToMessage(message.chat.id, message.message_id, async (replyMsg) => {
            bot.removeReplyListener(id);
            return sendMessage(myId, `Фидбек от ${msg.from.id} ${getUserName(session, "name")} (@${getUserName(session, "nickname")}): ${replyMsg.text}`, {
                disable_notification: true,
                reply_markup: {
                    selective: true,
                    force_reply: true
                }
            }).then(myMessage => {
                let newId = bot.onReplyToMessage(myId, myMessage.message_id, async (myReplyMsg) => {
                    bot.removeReplyListener(newId);
                    return sendMessage(msg.from.id, `Ответ разработчика: ${myReplyMsg.text}`);
                });
            });
        });
    });
}]];