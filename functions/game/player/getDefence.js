const getPlayerClass = require("./getPlayerClass");

module.exports = function (gameClass, baseStats) {
    let {stats} = getPlayerClass(gameClass);
    let defence = stats.defence;
    let lvl = baseStats.lvl;

    defence += (lvl - 1) * 1.2;
    return Math.ceil(defence);
};