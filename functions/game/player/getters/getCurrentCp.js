const getPlayerGameClass = require("./getPlayerGameClass");
const getMaxCp = require("./getMaxCp");

module.exports = function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    return Math.min(Math.round(stats.cp), getMaxCp(session, gameClass));
};