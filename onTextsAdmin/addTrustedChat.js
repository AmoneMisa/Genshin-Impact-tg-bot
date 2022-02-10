const sendMessage = require('../functions/sendMessage');
const bot = require('../bot');
const {myId} = require('../config');
const debugMessage = require('../functions/debugMessage');
const fs = require('fs');

module.exports = [[/(?:^|\s)\/mark_trusted\b/, async (msg) => {
    try {
        if (msg.from.id !== myId) {
            return;
        }
        const trustedChats = fs.readFileSync('trustedChats.json');
        let trustedChatsArray = JSON.parse(trustedChats);

        bot.deleteMessage(msg.chat.id, msg.message_id);
        if (!trustedChatsArray.includes(msg.chat.id)) {
            trustedChatsArray.push((msg.chat.id).toString());
        } else {
         return sendMessage(myId, `Чат уже добавлен в доверенные: ${msg.chat.id} - ${msg.chat.title}`);
        }

        fs.writeFileSync('trustedChats.json', JSON.stringify(trustedChatsArray));
        sendMessage(myId, `Чат добавлен в доверенные: ${msg.chat.id} - ${msg.chat.title}`);

    } catch (e) {
        debugMessage(`Command: /mark_trusted\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];
