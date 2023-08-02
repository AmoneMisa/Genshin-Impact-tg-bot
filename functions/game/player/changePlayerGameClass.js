const getGameClass = require('./getGameClassFromTemplate');

module.exports = function (session, classStats) {
    session.game.gameClass = getGameClass(classStats.name || classStats);
};