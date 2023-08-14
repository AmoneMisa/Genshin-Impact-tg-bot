const sendMessageWithDelete = require('../../tgBotFunctions/sendMessageWithDelete');
const getUserName = require('../../getters/getUserName');

module.exports = function (callback, session, item, message) {
    return sendMessageWithDelete(callback.message.chat.id, `@${getUserName(session, "nickname")}, ты получил(-а) ${item} ${message}`, {}, 10 * 1000);
};