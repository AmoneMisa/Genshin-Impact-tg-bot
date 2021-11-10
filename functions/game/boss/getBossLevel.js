const bossLevels = require("../../../templates/bossLevelsTemplate");

module.exports = function (boss) {
    if (boss.currentSummons === 0) {
        return 1;
    }

    let prevLvl = null;
    for (let {lvl, needSummons} of bossLevels) {
        if (boss.currentSummons < needSummons) {
            return prevLvl;
        }
        prevLvl = lvl;
    }

    return prevLvl;
};