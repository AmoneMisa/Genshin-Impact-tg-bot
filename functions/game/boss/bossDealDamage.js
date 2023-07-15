const calcBossDamage = require('./calcBossDamage');
const sendMessage = require('../../tgBotFunctions/sendMessage');
const debugMessage = require('../../tgBotFunctions/debugMessage');

module.exports = function (members, boss, chatId) {
    let message = `Босс нанёс урон всей группе:\n\n`;

    members = Object.values(members).filter(member => !member.game.boss.isDead);

    if (!members.length) {
        if (boss.skill.effect === "hp_regen" && boss.hpRegenIntervalId) {
            boss.hpRegenIntervalId = null;
        }

        boss.skill = null;
        clearInterval(boss.attackIntervalId);
        debugMessage(`DEBUG. Все члены группы мертвы: ${boss.attackIntervalId}`);
        boss.attackIntervalId = null;
        boss.damagedHp = 0;
        boss.hp = 0;

        return false;
    }

    for (let member of Object.values(members)) {
        let player = member.game.boss;
        let dmg = calcBossDamage(boss, member);
        message += `${member.userChatData.user.username} - ${dmg} урона`;

        if (member.game.boss.hasOwnProperty("shield")) {
            if (player.shield > 0) {
                if (dmg > player.shield) {
                    player.shield = 0;
                    dmg = dmg - player.shield;

                } else {
                    player.shield -= dmg;
                }
            }
        }

        player.damagedHp += dmg;

        if (player.hp <= player.damagedHp && !player.isDead) {
            player.isDead = true;
            player.damagedHp = 0;
            sendMessage(chatId, `@${member.userChatData.user.username}, ты был повержен(-а) боссом.`, {
                disable_notification: true
            });
        }
    }

    return message;
};