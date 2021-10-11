const bot = require('../../bot');
const {myId} = require('../../config');
const {sessions} = require('../../data');
const sendMessage = require('../../functions/sendMessage');
const getSession = require('../../functions/getSession');
const commands = require('../../dictionaries/commands');
const translation = require('../../dictionaries/translate');

module.exports = [[/(?:^|\s)\/set(.*?)\b/, async (msg, regResult) => {
    try {
        let regResultStr = regResult[1];
        let session = await getSession(sessions, msg.chat.id, msg.from.id);

        bot.deleteMessage(session.keyboardMessage.chat.id, session.keyboardMessage.message_id);
        bot.deleteMessage(msg.chat.id, msg.message_id);

        for (let command of commands) {
            if (!command.toLowerCase().includes(regResultStr.toLowerCase())) {
                continue;
            }

            sendMessage(msg.chat.id, `Твой(-я) ${translation[command].toLowerCase()}, @${session.userChatData.user.username}?`, {
                disable_notification: true,
                reply_markup: {
                    selective: true,
                    force_reply: true
                }
            }).then((msg) => {
                let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
                    bot.removeReplyListener(id);
                    session.user[command] = replyMsg.text;
                    bot.deleteMessage(replyMsg.chat.id, replyMsg.message_id);
                    bot.deleteMessage(msg.chat.id, msg.message_id);
                });
            }).catch(e => {
                console.error(e);
            });
        }
    } catch (e) {
        sendMessage(myId, `Command: /set${regResult[1]}\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
    }
}

]];