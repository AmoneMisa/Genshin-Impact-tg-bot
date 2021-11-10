const getPlayerClass = require("./getPlayerClass");

module.exports = function (session) {
    let {stats} = getPlayerClass(session);
    let attack = stats.attack;
    let lvl = session.game.stats.lvl;

    attack += (lvl - 1) * 2;
    return attack;
};