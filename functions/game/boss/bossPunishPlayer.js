const bot = require('../../../bot');
const sendMessage = require('../../sendMessage');

module.exports = function (player, chatId, session) {
    if (player.hp < player.damagedHp) {
        bot.restrictChatMember(chatId, session.userChatData.user.id, {
            permissions: {
                can_send_messages: false,
                can_change_info: false,
                can_pin_messages: false,
                can_send_other_messages: false
            },
            until_date: new Date().getTime() + 120 * 1000
        });
        return sendMessage(chatId, `${session.userChatData.user.username}, ты был повержен(-а) боссом.`, {
            disable_notification: true,
            reply_markup: {
                selective: true
            }
        });
    }
};