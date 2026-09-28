import bot from '../../bot.js';
import sendMessage from '../../functions/tgBotFunctions/sendMessage.js';
import commands from '../../dictionaries/commands.js';
import translation from '../../dictionaries/translate.js';
import getUserName from '../../functions/getters/getUserName.js';
import deleteMessage from '../../functions/tgBotFunctions/deleteMessage.js';
import loadPlayer from '../../functions/getters/loadPlayer.js';

export default [[/(?:^|\s)\/set[A-Z][A-z]*\b/, async (msg, regResult, session) => {
    let regResultStr = regResult[1];
    await deleteMessage(session.keyboardMessage.chat.id, session.keyboardMessage.message_id);
    await deleteMessage(msg.chat.id, msg.message_id);

    for (let command of commands) {
        if (!command.toLowerCase().includes(regResultStr.toLowerCase())) {
            continue;
        }

        sendMessage(msg.chat.id, `Твой(-я) ${translation[command].toLowerCase()}, @${await getUserName(session, "nickname")}?`, {
            ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
            disable_notification: true,
            reply_markup: {
                selective: true,
                force_reply: true
            }
        }).then((msg) => {
            let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, async (replyMsg) => {
                bot.removeReplyListener(id);
                const { chat, member } = await loadPlayer(replyMsg.chat.id, session.userId);
                if (member) {
                    if (!member.user) {
                        member.user = {};
                    }
                    member.user[command] = replyMsg.text;
                    await chat.save();
                }
                deleteMessage(replyMsg.chat.id, replyMsg.message_id);
                deleteMessage(msg.chat.id, msg.message_id);
            });
        }).catch(e => {
            console.error(e);
        });
    }
}]];