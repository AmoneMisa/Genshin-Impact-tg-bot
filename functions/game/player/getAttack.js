const getPlayerGameClass = require("./getPlayerGameClass");

module.exports = function (gameClass, baseStats) {
    let {stats} = getPlayerGameClass(gameClass);
    let attack = stats.attack;
    let lvl = baseStats.lvl;

    attack += (lvl - 1) * 2;
    return attack;
};