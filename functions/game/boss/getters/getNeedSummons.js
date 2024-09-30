import bossLevels from '../../../../template/bossLevelsTemplate.js';

export default function (bossName, lvl) {
    return bossLevels(bossName).find(item => item.lvl === lvl + 1).needSummons;
}