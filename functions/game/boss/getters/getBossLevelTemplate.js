const bossLevels = require("../../../../template/bossLevelsTemplate");

module.exports = function (bossName, level) {
    return bossLevels(bossName).find(_level => _level.lvl === level);
};