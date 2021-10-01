const deleteMessage = require('../../functions/deleteMessage');
const sendMessage = require('../../functions/sendMessage');
const translation = require('../../dictionaries/translate');
const bot = require('../../bot');

module.exports = [[/^menu\.[^.]+$/, function (session, callback) {
    const [, item] = callback.data.match(/^menu\.([^.]+)$/);

    deleteMessage(callback.message.chat.id, session.messages, callback.message.message_id);
    session.anchorMessageId = callback.message.message_id;
    session.anchorMenuMessageId = callback.message.message_id;

    if (!item || !translation[item]) {
        deleteMessage(callback.message.chat.id, session.messages, callback.message.message_id);
        return ;
    }

    return sendMessage(session, callback.message.chat.id, `Твой(-я) ${translation[item].toLowerCase()}?`, {
        disable_notification: true,
        reply_markup: {
            force_reply: true
        }
    }).then((msg) => {
        deleteMessage(callback.message.chat.id, session.messages, msg.message_id);
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (msg) => {
            bot.removeReplyListener(id);
            session.user[item] = msg.text;
            deleteMessage(callback.message.chat.id, session.messages, callback.message.message_id);
        });

    }).catch(e => {
        deleteMessage(callback.message.chat.id, session.messages, callback.message.message_id);
        console.error(e);
    });
}]];