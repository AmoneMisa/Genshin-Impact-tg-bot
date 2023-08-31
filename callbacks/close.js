const deleteMessage = require("../functions/tgBotFunctions/deleteMessage");

module.exports = [["close", async function (session, callback) {
    await deleteMessage(callback.message.chat.id, callback.message.message_id)
}]];