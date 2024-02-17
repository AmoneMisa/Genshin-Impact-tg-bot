const sendMessage = require('../functions/tgBotFunctions/sendMessage');
const deleteMessage = require("../functions/tgBotFunctions/deleteMessage");
const {myId, token} = require("../config");
const {sessions} = require("../data");
const bot = require("../bot");
const fs = require("fs");
const https = require("https");

module.exports = [[/(?:^|\s)\/send_new_updates\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    await deleteMessage(msg.chat.id, msg.message_id);
    await sendMessage(msg.from.id, "Сообщение для рассылки новостей", {
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then(msg => {
            let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
                bot.removeReplyListener(id);
                let foundedSessionsId = new Set();

                for (let chatSession of Object.values(sessions)) {
                    for (let session of Object.values(chatSession.members)) {
                        let sessionId = session.userChatData.user.id;

                        if (!sessions[sessionId]) {
                            continue;
                        }

                        if (session.userChatData.user.is_bot) {
                            continue;
                        }

                        if (!sessions[sessionId].members[sessionId].whatsNewSettings.flag) {
                            continue;
                        }

                        foundedSessionsId.add(sessionId);
                    }
                }

                for (let sessionId of foundedSessionsId) {
                    sendMessage(sessionId, `Новости: ${replyMsg.text}`, {
                        reply_markup: {
                            disable_notification: true
                        }
                    })
                }
            })
        }
    );
}]];