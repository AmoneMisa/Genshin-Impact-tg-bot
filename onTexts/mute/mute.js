import bot from '../../bot.js';
import debugMessage from '../../functions/tgBotFunctions/debugMessage.js';
import sendMessage from '../../functions/tgBotFunctions/sendMessage.js';
import getUserName from '../../functions/getters/getUserName.js';
import deleteMessage from '../../functions/tgBotFunctions/deleteMessage.js';

export default [[/(?:^|\s)\/self_mute\b/, (msg, session) => {
    deleteMessage(msg.chat.id, msg.message_id);
    bot.restrictChatMember(msg.chat.id, msg.from.id, {
        permissions: {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_pin_messages: false
        },
        until_date: Math.round(new Date().getTime() / 1000.0) + (2 * 60)
    }).then(res => {
        if (res) {
            sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, получил мут на 2 минуты.`, {
                disable_notification: true,
                ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),

            })
        } else {
            sendMessage(msg.chat.id, `@${getUserName(session, "nickname")}, админу нельзя замутаться.`, {
                disable_notification: true,
                ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {})
            });
            debugMessage(`${getUserName(session, "nickname")},\n\n${JSON.stringify(session.userChatData)},\n\nsuccess - ${success}`);
        }
    });
}]];