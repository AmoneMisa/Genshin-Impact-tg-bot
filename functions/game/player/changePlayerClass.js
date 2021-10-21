const getGameClass = require('./getGameClass');

module.exports = function (session, playerClass) {
    session.game.gameClass = getGameClass(playerClass);
};