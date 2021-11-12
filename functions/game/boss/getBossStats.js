const getBossLevel = require("./getBossLevel");

module.exports = function (boss) {
    let lvl = getBossLevel(boss) - 1;

    return {
        attack: 10 + 3 * lvl,
        defence: 15 + 4 * lvl,
        minDamage: 250,
        maxDamage: 320,
        criticalChance: 35,
        criticalDamage: 1.25
    }
};