module.exports = function (gameClass) {
    if (!gameClass) {
        return null;
    }
    return {skills: gameClass.skills, stats: gameClass.stats || gameClass};
};