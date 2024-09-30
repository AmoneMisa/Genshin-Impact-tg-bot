import bossLevels from '../../../../template/bossLevelsTemplate.js';

export default function (bossName, currentSummons) {
    if (currentSummons === 0) {
        return 1;
    }

    let prevLvl = null;

    for (let {lvl, needSummons} of bossLevels(bossName)) {
        if (currentSummons < needSummons) {
            return prevLvl;
        }

        prevLvl = lvl;
    }

    return prevLvl;
};