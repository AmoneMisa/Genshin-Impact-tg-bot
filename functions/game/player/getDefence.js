const getPlayerGameClass = require("./getPlayerGameClass");

module.exports = function (gameClass) {
    let {stats} = getPlayerGameClass(gameClass);
    return stats.defence;
};