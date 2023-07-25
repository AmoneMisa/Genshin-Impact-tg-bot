const bossLevels = require("../../../../templates/bossLevelsTemplate");

module.exports = function (bossName, lvl) {
    return bossLevels(bossName).find(item => item.lvl === lvl + 1).needSummons;
}