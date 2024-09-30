const bossLevels = require("../../../../template/bossLevelsTemplate");

module.exports = function (bossName, lvl) {
    return bossLevels(bossName).find(item => item.lvl === lvl + 1).needSummons;
}