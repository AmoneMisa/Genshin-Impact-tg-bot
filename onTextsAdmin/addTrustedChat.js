const sendMessage = require('../functions/sendMessage');
const bot = require('../bot');
const {myId} = require('../config');
const {updTrustedChats} = require('../data');
const debugMessage = require('../functions/debugMessage');
const fs = require('fs');

module.exports = [[/(?:^|\s)\/mark_trusted\b/, async (msg) => {
    try {
        if (msg.from.id !== myId) {
            return;
        }

        sendMessage(myId, "Введи id чата, чтобы добавить его в доверенные.", {
            force_reply: true,
            selective: true,
        }).then(msg => {
            bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
                const trustedChats = fs.readFileSync('trustedChats.json');
                let trustedChatsArray = JSON.parse(trustedChats);

                if (!trustedChatsArray.includes(replyMsg.text)) {
                    trustedChatsArray.push((replyMsg.text).toString());
                    fs.writeFileSync('trustedChats.json', JSON.stringify(trustedChatsArray));
                    updTrustedChats();
                    sendMessage(myId, `Чат добавлен в доверенные: ${replyMsg.text}`);
                } else {
                    return sendMessage(myId, `Чат уже добавлен в доверенные: ${replyMsg.text}`);
                }

                bot.deleteMessage(replyMsg.chat.id, replyMsg.message_id);
                bot.deleteMessage(msg.chat.id, msg.message_id);
            });
        });

    } catch (e) {
        debugMessage(`Command: /mark_trusted\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];
