const bot = require('../../bot');
const debugMessage = require('../../functions/tgBotFunctions/debugMessage');
const sendMessage = require('../../functions/tgBotFunctions/sendMessage');
const commands = require('../../dictionaries/commands');
const translation = require('../../dictionaries/translate');
const getUserName = require('../../functions/getters/getUserName');

module.exports = [[/(?:^|\s)\/set[A-Z][A-z]*\b/, async (msg, regResult, session) => {
    try {
        let regResultStr = regResult[1];

        bot.deleteMessage(session.keyboardMessage.chat.id, session.keyboardMessage.message_id);
        bot.deleteMessage(msg.chat.id, msg.message_id);

        for (let command of commands) {
            if (!command.toLowerCase().includes(regResultStr.toLowerCase())) {
                continue;
            }

            sendMessage(msg.chat.id, `Твой(-я) ${translation[command].toLowerCase()}, @${getUserName(session, "nickname")}?`, {
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
        debugMessage(`Command: /set${regResult[1]}\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}

]];