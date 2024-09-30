import bossLevels from '../../../../template/bossLevelsTemplate.js';

export default function (bossName, level) {
    return bossLevels(bossName).find(_level => _level.lvl === level);
};