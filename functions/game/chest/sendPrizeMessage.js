const sendMessage = require('../../../functions/sendMessage');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');

module.exports = function (callback, session, item, message) {
    return sendMessage(callback.message.chat.id, `@${session.userChatData.user.username}, ты получил(-а) ${item} ${message}`)
        .then(message => deleteMessageTimeout(callback.message.chat.id, message.message_id, 10000));
};