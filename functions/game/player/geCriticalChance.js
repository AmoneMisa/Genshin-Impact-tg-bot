const getPlayerClass = require("./getPlayerClass");

module.exports = function (session) {
    let {stats} = getPlayerClass(session);
    return stats.criticalChance;
};