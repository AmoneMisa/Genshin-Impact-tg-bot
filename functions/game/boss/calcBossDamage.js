const getRandom = require('../../getters/getRandom');
const getPlayerDefence = require('../player/getDefence');
const getBossAttack = require('./getBossAttack');

module.exports = function (boss, player) {
    let attack = getBossAttack(boss);
    let defence = getPlayerDefence(player);

    let dmg =  Math.ceil(getRandom(250, 370) * (Math.pow(1.05, attack) / Math.pow(1.03, defence)));

    if (getRandom(0, 100) <= boss.stats.criticalChance) {
        dmg *= boss.stats.criticalDamage;
    }

    return dmg;
};