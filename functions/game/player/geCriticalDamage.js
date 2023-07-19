const getPlayerClass = require("./getPlayerGameClass");

module.exports = function (session) {
    let {stats} = getPlayerClass(session);

    return stats.criticalDamage;
};