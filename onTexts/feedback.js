import bot from '../bot.js';
import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import deleteMessage from '../functions/tgBotFunctions/deleteMessage.js';
import getUserName from '../functions/getters/getUserName.js';
import getSession from '../functions/getters/getSession.js';
import { myId } from '../config.js';

export default [[/(?:^|\s)\/feedback/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    sendMessage(msg.from.id, `${getUserName(session, "name")}, Возникли вопросы? Нашли баг? Есть предложения или пожелания? Можете написать Ваши мысли в ответ к этому сообщению.`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then(message => {
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