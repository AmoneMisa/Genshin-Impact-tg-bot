const getPlayerGameClass = require("./getPlayerGameClass");
const getMaxMp = require("./getMaxMp");

module.exports = function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    return Math.min( Math.round(stats.mp), getMaxMp(session, gameClass));
};