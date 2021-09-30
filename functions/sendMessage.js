const bot = require('../bot');

module.exports = function (session, chatId, text, form) {
    return bot.sendMessage(chatId, text, form)
        .then(msg => {
            session.messages.push(msg.message_id);
            return msg;
        });
};