import getNeedSummons from '../../../functions/game/boss/getters/getNeedSummons.js';
import getBossLevelByCurrentSummons from '../../../functions/game/boss/getters/getBossLevelByCurrentSummons.js';

export default function (boss) {
    boss.stats.lvl = getBossLevelByCurrentSummons(boss.name, boss.stats.currentSummons);
    boss.stats.needSummons = getNeedSummons(boss.name, boss.stats.lvl);
}