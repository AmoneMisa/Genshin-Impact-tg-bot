const sendMessage = require('../functions/tgBotFunctions/sendMessage');
const bot = require('../bot');
const {myId} = require('../config');
const debugMessage = require('../functions/tgBotFunctions/debugMessage');
const deleteMessage = require("../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/get_chat_data\b/, async (msg) => {
        try {
            if (msg.from.id !== myId) {
                return;
            }

            deleteMessage(msg.chat.id, msg.message_id);
            await sendMessage(myId, `Данные из чата: ${msg.chat.id} - ${msg.chat.title};\n\nmsg: ${JSON.stringify(msg)}\n\n${JSON.stringify(await bot.getChat(msg.chat.id))}`);

        } catch (e) {
            debugMessage(`Command: /get_chat_data\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
            throw e;
        }
    }
]];