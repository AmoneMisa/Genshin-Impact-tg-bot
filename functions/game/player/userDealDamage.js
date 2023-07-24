const bossReflectDamage = require('../boss/bossReflectDamage');
const calcDamage = require('../boss/calcDamage');
const userVampireSkill = require('./userVampireSkill');

module.exports = function (session, boss, skill) {
    if (!boss) {
        throw new Error("Босс не найден!");
    }

    let {dmg, isHasCritical} = calcDamage(session, skill, boss);
    let vampire;
    let playerStats = session.game.gameClass.stats;

    if (skill.effect.includes("vampire")) {
        vampire = userVampireSkill(skill, dmg);
        playerStats.hp += vampire;

        if (playerStats.hp <= 0) {
            playerStats.hp = 0;
        }

        if (playerStats.hp > playerStats.maxHp) {
            playerStats.hp = playerStats.maxHp;
        }
    }

    boss.currentHp -= dmg;

    if (boss.currentHp <= 0) {
        boss.currentHp = 0;
    }

    let findPlayer = boss.listOfDamage.find(player => player.id === session.userChatData.user.id);
    if (!findPlayer) {
        boss.listOfDamage.push({id: session.userChatData.user.id, damage: dmg});
    } else {
        findPlayer.damage += dmg;
    }

    let reflectDamage;

    if (boss.skill.effect.includes("reflect") || boss.skill.effect.includes("rage")) {
        reflectDamage = bossReflectDamage(boss, dmg);
        playerStats.hp -= Math.min(playerStats.hp, reflectDamage);
        session.game.gameClass.stats.hp = playerStats.hp;
    }

    return {isHasCritical, dmg, vampire: vampire || 0, reflectDamage: reflectDamage || 0};
};