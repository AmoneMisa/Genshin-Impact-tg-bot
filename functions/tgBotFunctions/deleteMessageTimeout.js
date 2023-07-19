const deleteMessage = require('./deleteMessage');

module.exports = function (chatId, msg, milliseconds) {
    if (!msg) {
        return;
    }

    setTimeout(() => deleteMessage(chatId, msg), milliseconds);
};