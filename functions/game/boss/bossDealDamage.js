const bot = require('../../../bot');
const sendMessage = require('../../sendMessage');

module.exports = async function (session, boss, dmg, chatId) {
    let player = session.game.boss;
    if (boss.skill.effect.includes("reflect")) {
        if (player.damagedHp < player.hp) {
            player.damagedHp += Math.ceil(dmg * 0.3);

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
                return sendMessage(chatId, `${session.userChatData.user.username}, ты был повержен(-а) боссом.`, {
                    disable_notification: true,
                    reply_markup: {
                        selective: true
                    }
                });
            }
            return `Босс нанёс тебе ${Math.ceil(dmg * 0.3)} урона рефлектом. Твоё оставшееся хп: ${player.hp - player.damagedHp}`;
        }
    }

    if (boss.skill.effect.includes("hp_regen")) {
       return "";
    }

    if (boss.skill.effect.includes("rage")) {
        if (player.damagedHp < player.hp) {
            player.damagedHp += Math.ceil(dmg * 0.5);

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
                return sendMessage(chatId, `${session.userChatData.user.username}, ты был повержен(-а) боссом.`, {
                    disable_notification: true,
                    reply_markup: {
                        selective: true
                    }
                });
            }
            return `Босс нанёс тебе ${Math.ceil(dmg * 0.5)} урона рефлектом. Твоё оставшееся хп: ${player.hp - player.damagedHp}`;
        }
    }
};