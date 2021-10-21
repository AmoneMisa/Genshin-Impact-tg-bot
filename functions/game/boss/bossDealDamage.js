const mathDamage = require('../../game/boss/mathDamage');
const getRandom = require('../../getRandom');

module.exports = async function (members, boss) {
    let bossStats = boss.stats;
    let dmg = bossStats.attack * 5 + getRandom(bossStats.minDamage, bossStats.maxDamage);

    for (let member of Object.values(members)) {
        member.game.boss.damagedHp -= mathDamage()
    }
};