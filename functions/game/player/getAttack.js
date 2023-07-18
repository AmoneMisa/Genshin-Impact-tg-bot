const getPlayerClass = require("./getPlayerClass");

module.exports = function (gameClass, baseStats) {
    let {stats} = getPlayerClass(gameClass);
    let attack = stats.attack;
    let lvl = baseStats.lvl;

    attack += (lvl - 1) * 2;
    return attack;
};