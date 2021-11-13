const bossLevels = require("../../../templates/bossLevelsTemplate");

module.exports = function (level) {
    return bossLevels.find(_level => _level.lvl === level);
};