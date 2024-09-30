import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import getMembers from '../functions/getters/getMembers.js';
import bot from '../bot.js';
import { myId } from '../config.js';
import { updTrustedChats } from '../data.js';
import fs from 'fs';
import deleteMessage from '../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/mark_trusted\b/, async (msg) => {
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
            let uniqueIds = new Set();

            for (let id of trustedChatsArray) {
                uniqueIds.add(id);
            }

            let chatMembers = getMembers(replyMsg.text);
            let trustedChatsContainsAllMembers = true;

            if (!uniqueIds.has(replyMsg.text)) {
                trustedChatsArray = [];
                uniqueIds.add((replyMsg.text).toString());
                trustedChatsArray = Array.from(uniqueIds);

                fs.writeFileSync('trustedChats.json', JSON.stringify(trustedChatsArray));
                updTrustedChats();
                sendMessage(myId, `Чат добавлен в доверенные: ${replyMsg.text}`);
            }

            if (chatMembers) {
                for (let memberId of Object.keys(chatMembers)) {
                    if (!uniqueIds.has(memberId)) {
                        trustedChatsContainsAllMembers = false;
                        break;
                    }
                }
            }

            if (!trustedChatsContainsAllMembers) {
                let ids = "";
                trustedChatsArray = [];

                for (let memberId of Object.keys(chatMembers)) {
                    if (!uniqueIds.has(memberId)) {
                        uniqueIds.add(memberId);
                        ids += `${memberId}; `;
                    }
                }

                trustedChatsArray = Array.from(uniqueIds);
                fs.writeFileSync('trustedChats.json', JSON.stringify(trustedChatsArray));
                updTrustedChats();
                sendMessage(myId, `Чаты добавлены в доверенные: ${ids}`);
            } else {
                return sendMessage(myId, `Все приватные чаты уже добавлены в доверенные: ${replyMsg.text}`);
            }

            deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            deleteMessage(msg.chat.id, msg.message_id);
        });
    });
}]];
