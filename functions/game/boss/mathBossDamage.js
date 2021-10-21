const getRandom = require('../../getRandom');

module.exports = function (boss, player) {
    let dmg = boss.stats.attack * 5 + getRandom(boss.stats.minDamage, boss.stats.maxDamage);

    dmg = dmg / (player.game.gameClass.stats.defence * 3);

    if (getRandom(0, 100) <= boss.stats.criticalChance) {
        dmg *= boss.stats.criticalDamage;
    }

    return Math.ceil(dmg);
};