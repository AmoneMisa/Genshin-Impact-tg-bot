const getNeedSummons = require('../../../functions/game/boss/getters/getNeedSummons.js');
const getBossLevelByCurrentSummons = require('../../../functions/game/boss/getters/getBossLevelByCurrentSummons');

module.exports = function (boss) {
    boss.stats.lvl = getBossLevelByCurrentSummons(boss.name, boss.stats.currentSummons);
    boss.stats.needSummons = getNeedSummons(boss.name, boss.stats.lvl);
}