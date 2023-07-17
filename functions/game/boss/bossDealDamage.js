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
        boss.currentHp = 0;
        boss.hp = 0;

        return false;
    }

    for (let member of Object.values(members)) {
        let player = member.game;
        let dmg = calcBossDamage(boss, member);
        message += `${member.userChatData.user.username} - ${dmg} урона`;

        let playerShield = player.effects.filter(effect => effect.name === "shield");

        if (playerShield) {
            if (playerShield.shield > 0) {
                if (dmg > playerShield.shield) {
                    playerShield.shield = 0;
                    dmg = dmg - playerShield.shield;

                } else {
                    player.shield -= dmg;
                }
            }
        }

        player.currentHp -= dmg;

        if (player.hp <= player.currentHp && !player.isDead) {
            player.isDead = true;
            player.currentHp = 0;
            sendMessage(chatId, `@${member.userChatData.user.username}, ты был повержен(-а) боссом.`, {
                disable_notification: true
            });
        }
    }

    return message;
};