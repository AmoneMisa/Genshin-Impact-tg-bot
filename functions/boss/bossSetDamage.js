const bot = require('../../bot');
const sendMessage = require('../sendMessage');

module.exports = async function (session, boss, dmg, chatId) {
    let player = session.game.boss;
    if (boss.skill.effect.includes("reflect")) {
        if (player.damagedHp < player.hp) {
            player.damagedHp += dmg * 0.3;

            if (player.hp < player.damagedHp) {
                await bot.restrictChatMember(chatId, session.userChatData.user.id, {
                    permissions: {
                        can_send_messages: false,
                        can_change_info: false,
                        can_pin_messages: false,
                        can_send_other_messages: false
                    },
                    until_date: new Date().getTime() + 120 * 1000
                });
                return sendMessage(chatId, `${session.userChatData.user.username}, ты был повержен(-а) боссом. Банан на 2 минуты`, {
                    disable_notification: true,
                    reply_markup: {
                        selective: true
                    }
                });
            }
            return sendMessage(chatId, `${session.userChatData.user.username}, босс нанёс тебе ${dmg * 0.3} урона рефлектом. Твоё оставшееся хп: ${player.hp - player.damagedHp}`, {
                disable_notification: true,
                reply_markup: {
                    selective: true
                }
            });
        }
    }
};