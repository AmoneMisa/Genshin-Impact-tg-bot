const bot = require('../../bot');
const sendMessage = require('../../functions/tgBotFunctions/sendMessage');
const commands = require('../../dictionaries/commands');
const translation = require('../../dictionaries/translate');
const getUserName = require('../../functions/getters/getUserName');
const deleteMessage = require("../../functions/tgBotFunctions/deleteMessage");

module.exports = [[/(?:^|\s)\/set[A-Z][A-z]*\b/, async (msg, regResult, session) => {
    let regResultStr = regResult[1];
    await deleteMessage(session.keyboardMessage.chat.id, session.keyboardMessage.message_id);
    await deleteMessage(msg.chat.id, msg.message_id);

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
                deleteMessage(replyMsg.chat.id, replyMsg.message_id);
                deleteMessage(msg.chat.id, msg.message_id);
            });
        }).catch(e => {
            console.error(e);
        });
    }
}]];