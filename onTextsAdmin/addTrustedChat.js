const sendMessage = require('../functions/sendMessage');
const bot = require('../bot');
const {trustedChats} = require('../trustedChats');
const {myId} = require('../config');
const debugMessage = require('../functions/debugMessage');
const fs = require('fs');

module.exports = [[/(?:^|\s)\/mark_trusted\b/, async (msg) => {
    try {
        if (msg.from.id !== myId) {
            return;
        }

        bot.deleteMessage(msg.chat.id, msg.message_id);

        if (!trustedChats.includes(msg.chat.id)) {
            trustedChats.push(msg.chat.id);
        } else {
         return sendMessage(myId, `Чат уже добавлен в доверенные: ${msg.chat.id} - ${msg.chat.title}`);
        }

        fs.writeFileSync(`../trustedChats.json`, JSON.stringify(trustedChats));
        sendMessage(myId, `Чат добавлен в доверенные: ${msg.chat.id} - ${msg.chat.title}`);

    } catch (e) {
        debugMessage(`Command: /mark_trusted\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];