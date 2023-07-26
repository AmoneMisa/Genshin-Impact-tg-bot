const getGameClass = require('./getGameClassFromTemplate');

module.exports = function (session, classStats) {
    return session.game.gameClass = getGameClass(classStats.name || classStats);
};