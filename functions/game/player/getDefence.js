const getPlayerGameClass = require("./getPlayerGameClass");

module.exports = function (gameClass, baseStats) {
    let {stats} = getPlayerGameClass(gameClass);
    let defence = stats.defence;
    let lvl = baseStats.lvl;

    defence += (lvl - 1) * 1.2;
    return Math.ceil(defence);
};