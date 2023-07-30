const sendMessage = require('../functions/tgBotFunctions/sendMessage');
const getMembers = require('../functions/getters/getMembers');
const bot = require('../bot');
const {myId} = require('../config');
const {updTrustedChats} = require('../data');
const fs = require('fs');
const deleteMessage = require("../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/mark_trusted\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    sendMessage(myId, "Введи id чата, чтобы добавить его в доверенные.", {
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then(msg => {
        bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            const trustedChats = fs.readFileSync('trustedChats.json');
            let trustedChatsArray = JSON.parse(trustedChats);
            let chatMembers = getMembers(replyMsg.text);
            let trustedChatsContainsAllMembers = true;

            if (chatMembers) {
                for (let memberId of Object.keys(chatMembers)) {
                    if (!trustedChatsArray.includes(memberId)) {
                        trustedChatsContainsAllMembers = false;
                        break;
                    }
                }
            }

            if (!trustedChatsArray.includes(replyMsg.text)) {
                trustedChatsArray.push((replyMsg.text).toString());
                fs.writeFileSync('trustedChats.json', JSON.stringify(trustedChatsArray));
                updTrustedChats();
                sendMessage(myId, `Чат добавлен в доверенные: ${replyMsg.text}`);
            } else if (!trustedChatsContainsAllMembers) {
                let ids = "";
                for (let memberId of Object.keys(chatMembers)) {
                    if (!trustedChatsArray.includes(memberId)) {
                        trustedChatsArray.push(memberId);
                        ids += `${memberId}; `;
                    }
                }
                sendMessage(myId, `Чаты добавлены в доверенные: ${ids}`);
            } else {
                return sendMessage(myId, `Чат уже добавлен в доверенные: ${replyMsg.text}`);
            }

            deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            deleteMessage(msg.chat.id, msg.message_id);
        });
    });
}]];
