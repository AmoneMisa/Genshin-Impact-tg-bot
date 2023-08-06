const getRandom = require('../../getters/getRandom');
const getPlayerDefence = require('../player/getters/getDefence');
const getIncomingDamageModifier = require('../player/getters/getIncomingDamageModifier');
const getBossAttack = require('./getBossStats/getBossAttack');
const bossesTemplate = require("../../../templates/bossTemplate");

module.exports = function (boss, session) {
    let bossTemplate = bossesTemplate.find(boss => boss.name === boss.name);
    let attack = getBossAttack(boss, bossTemplate);
    let defence = getPlayerDefence(session.game.gameClass);
    let reduceIncomingPlayerDamage = getIncomingDamageModifier(session.game.gameClass) + 1;
    let dmg = Math.ceil(getRandom(boss.stats.minDamage, boss.stats.maxDamage) * attack / defence) * reduceIncomingPlayerDamage;

    if (Math.random() * 100 <= boss.stats.criticalChance) {
        dmg *= boss.stats.criticalDamage;
    }

    return dmg;
};