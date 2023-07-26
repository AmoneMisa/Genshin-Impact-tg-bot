const getPlayerGameClass = require("./getPlayerGameClass");

module.exports = function (session) {
    let {stats} = getPlayerGameClass(session);
    return stats.reduceIncomingDamage;
};