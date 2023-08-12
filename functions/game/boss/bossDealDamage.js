const calcBossDamage = require('./calcBossDamage');
const getCurrentHp = require("../player/getters/getCurrentHp");
const lodash = require("lodash");

module.exports = function (members, boss) {
    if (!boss) {
        throw new Error("Босс не найден!");
    }

    let filteredMembers = Object.values(members).filter(member => !member.userChatData.user.is_bot && !member.isHided && getCurrentHp(member) > 0);

    if (!filteredMembers.length) {
        boss.skill = {};
        boss.currentHp = 0;
        boss.hp = 0;

        return false;
    }

    let bossDmg = {};

    for (let member of filteredMembers) {
        let player = member.game;
        let dmg = Math.ceil(calcBossDamage(boss, member));
        let playerShield = player.effects.find(effect => effect.name === "shield");
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

        if (player.gameClass.stats.hp < 0) {
            player.gameClass.stats.hp = 0;
        }

        bossDmg[member.userChatData.user.id] = {
            dmg,
            username: lodash.isUndefined(member.userChatData.user.username)
                ? member.userChatData.user.first_name
                : member.userChatData.user.username,
            hp: player.gameClass.stats.hp
        };
    }

    return bossDmg;
};