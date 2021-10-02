const sendMessage = require('../../functions/sendMessage');
const translation = require('../../dictionaries/translate');
const bot = require('../../bot');

module.exports = [[/^menu\.[^.]+$/, function (session, callback) {
    const [, item] = callback.data.match(/^menu\.([^.]+)$/);

    if (!item || !translation[item]) {
        bot.deleteMessage(callback.message.chat.id, callback.message.message_id);
        return;
    }

    return sendMessage( callback.message.chat.id, `Твой(-я) ${translation[item].toLowerCase()}, @${session.userChatData.user.username}?`, {
        disable_notification: true,
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then((msg) => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (msg) => {
            bot.removeReplyListener(id);
            session.user[item] = msg.text;
        });

    }).catch(e => {
        console.error(e);
    });
}]];