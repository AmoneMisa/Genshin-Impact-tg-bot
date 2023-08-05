const getGameClass = require('./getters/getGameClassFromTemplate');

module.exports = function (session, classStats) {
    session.game.gameClass = getGameClass(classStats.name || classStats);
};