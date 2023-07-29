const getPlayerGameClass = require("./getPlayerGameClass");

module.exports = function (session) {
    let {stats} = getPlayerGameClass(session.game.gameClass);
    return stats.reduceIncomingDamage;
};