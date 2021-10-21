const mathBossDamage = require('../../game/boss/mathBossDamage');
const bot = require('../../../bot');
const sendMessage = require('../../sendMessage');


module.exports = function (members, boss, chatId) {
    for (let member of Object.values(members)) {
        member.game.boss.damagedHp -= mathBossDamage(boss, member);

        if (member.game.boss.hp < member.game.boss.damagedHp) {
            bot.restrictChatMember(chatId, member.userChatData.user.id, {
                permissions: {
                    can_send_messages: false,
                    can_change_info: false,
                    can_pin_messages: false,
                    can_send_other_messages: false
                },
                until_date: new Date().getTime() + 120 * 1000
            });
            return sendMessage(chatId, `${member.userChatData.user.username}, ты был повержен(-а) боссом.`, {
                disable_notification: true
            });
        }
    }
};