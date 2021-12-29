const bot = require('../../bot');
const debugMessage = require('../../functions/debugMessage');
const sendMessage = require('../../functions/sendMessage');

module.exports = [[/(?:^|\s)\/self_mute\b/, (msg, session) => {
    try {
        bot.deleteMessage(msg.chat.id, msg.message_id);
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
                sendMessage(msg.chat.id, `@${session.userChatData.user.username}, получил мут на 2 минуты.`, {
                    disable_notification: true
                })
            } else {
                sendMessage(msg.chat.id, `@${session.userChatData.user.username}, админу нельзя замутаться.`, {
                    disable_notification: true
                });
                debugMessage(`${session.userChatData.user.username},\n\n${JSON.stringify(session.userChatData)},\n\nsuccess - ${success}`);
            }
        });

    } catch (e) {
        debugMessage(`Command: /self_mute\nIn: ${msg.chat.id} - ${msg.chat.title}\n\nError: ${e}`);
        throw e;
    }
}]];