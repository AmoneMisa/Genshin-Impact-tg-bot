const bossLevels = require("../../../../templates/bossLevelsTemplate");

module.exports = function (bossName, level) {
    return bossLevels(bossName).find(_level => _level.lvl === level);
};