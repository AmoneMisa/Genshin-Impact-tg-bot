const getRandom = require('../../getters/getRandom');
const getPlayerDefence = require('../player/getDefence');
const getBossAttack = require('./getBossStats/getBossAttack');
const bossesTemplate = require("../../../templates/bossTemplate");

module.exports = function (boss, player) {
    let bossTemplate = bossesTemplate.find(boss => boss.name === boss.name);
    let attack = getBossAttack(boss, bossTemplate);
    let defence = getPlayerDefence(player);

    let dmg = Math.ceil(getRandom(250, 370) * (Math.pow(1.05, attack) / Math.pow(1.03, defence)));

    if (getRandom(0, 100) <= boss.stats.criticalChance) {
        dmg *= boss.stats.criticalDamage;
    }

    return dmg;
};