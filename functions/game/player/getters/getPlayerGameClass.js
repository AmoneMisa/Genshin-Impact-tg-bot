const getClassStatsFromTemplate = require("./getGameClassStatsFromTemplate");
module.exports = function (gameClass) {
    if (!gameClass) {
        gameClass = getClassStatsFromTemplate("noClass");
    }

    return {skills: gameClass.skills, stats: gameClass.stats || gameClass};
};