const sendMessage = require('../../tgBotFunctions/sendMessage');
const deleteMessageTimeout = require('../../tgBotFunctions/deleteMessageTimeout');
const getUserName = require('../../getters/getUserName');

module.exports = function (callback, session, item, message) {
    return sendMessage(callback.message.chat.id, `@${getUserName(session, "nickname")}, ты получил(-а) ${item} ${message}`)
        .then(message => deleteMessageTimeout(callback.message.chat.id, message.message_id, 10000));
};