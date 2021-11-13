const getPlayerClass = require("./getPlayerClass");

module.exports = function (session) {
    let {stats} = getPlayerClass(session);
    let defence = stats.defence;
    let lvl = session.game.stats.lvl;

    defence += Math.ceil((lvl - 1) * 1.2);
    return defence;
};