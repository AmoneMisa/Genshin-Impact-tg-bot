const getPlayerGameClass = require("./getPlayerGameClass");
const getMaxHp = require("./getMaxHp");
module.exports = function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    return Math.min(Math.round(stats.hp), getMaxHp(session, gameClass));
};