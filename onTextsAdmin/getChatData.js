const sendMessage = require('../functions/tgBotFunctions/sendMessage');
const bot = require('../bot');
const {myId} = require('../config');
const deleteMessage = require("../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/get_chat_data\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    await deleteMessage(msg.chat.id, msg.message_id);
    return sendMessage(myId, `Данные из чата: ${msg.chat.id} - ${msg.chat.title};\n\nmsg: ${JSON.stringify(msg)}\n\n${JSON.stringify(await bot.getChat(msg.chat.id))}`);
}]];