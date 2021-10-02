const bot = require('../bot');

module.exports = [["close", function (session, callback) {
    bot.deleteMessage(callback.message.chat.id, callback.message.message_id);
}]];