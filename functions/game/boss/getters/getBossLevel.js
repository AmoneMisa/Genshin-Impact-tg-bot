const bossLevels = require("../../../../templates/bossLevelsTemplate");

module.exports = function (boss) {
    if (boss.stats.currentSummons === 0) {
        return 1;
    }

    let prevLvl = null;
    for (let {lvl, needSummons} of bossLevels(boss.name)) {
        if (boss.stats.currentSummons < needSummons) {
            return prevLvl;
        }
        prevLvl = lvl;
        boss.stats.needSummons = needSummons;
    }

    return prevLvl;
};