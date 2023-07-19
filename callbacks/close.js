const deleteMessage = require("../functions/tgBotFunctions/deleteMessage");

module.exports = [["close", function (session, callback) {
    deleteMessage(callback.message.chat.id, callback.message.message_id)
}]];