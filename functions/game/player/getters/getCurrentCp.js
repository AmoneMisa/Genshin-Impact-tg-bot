const getPlayerGameClass = require("./getPlayerGameClass");

module.exports = function (gameClass, session) {
    let {stats} = getPlayerGameClass(gameClass);
    return stats.cp;
};