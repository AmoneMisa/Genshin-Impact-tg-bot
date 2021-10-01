const deleteMessage = require('../functions/deleteMessage');

module.exports = [["close", function (session, callback) {
    deleteMessage(callback.message.chat.id, session.messages, session.anchorMessageId);
}]];