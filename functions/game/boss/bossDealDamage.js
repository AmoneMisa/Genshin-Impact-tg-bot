const calcBossDamage = require('./calcBossDamage');
const debugMessage = require('../../tgBotFunctions/debugMessage');

module.exports = function (members, boss) {
    if (!boss) {
        throw new Error("Босс не найден!");
    }

    members = Object.values(members).filter(member => member.game.gameClass.stats.hp > 0);

    if (!members.length) {
        if (boss.skill && boss.skill.effect === "hp_regen" && boss.hpRegenIntervalId) {
            clearInterval(boss.hpRegenIntervalId);
            boss.hpRegenIntervalId = null;
        }

        boss.skill = {};
        clearInterval(boss.attackIntervalId);
        debugMessage(`DEBUG. Все члены группы мертвы: ${boss.attackIntervalId}`);
        boss.attackIntervalId = null;
        boss.currentHp = 0;
        boss.hp = 0;

        return false;
    }

    let bossDmg = {};
    let filteredMembers = Object.values(members).filter(member => !member.userChatData.user.is_bot);

    for (let member of Object.values(filteredMembers)) {
        let player = member.game;
        let dmg = Math.ceil(calcBossDamage(boss, player));
        let playerShield = player.effects.filter(effect => effect.name === "shield");
        let shield;

        if (playerShield && playerShield.value > 0) {
            shield = playerShield.value;
        } else {
            shield = 0;
        }

        let damageShield = Math.min(shield, dmg);
        let damageHp = Math.min(player.gameClass.stats.hp, dmg - damageShield);

        if (damageShield > 0) {
            playerShield.value -= damageShield;
        }

        player.gameClass.stats.hp -= damageHp;

        if (player.gameClass.stats.hp <= 0) {
            player.gameClass.stats.hp = 0;
        }

        bossDmg[member.userChatData.user.id] = {
            dmg,
            username: member.userChatData.user.username,
            hp: player.gameClass.stats.hp
        };
    }

    return bossDmg;
};