const getPlayerClass = require('./getPlayerClass');

module.exports = function (session, playerClass) {
    let player = session.game;
    player.gameClass = getPlayerClass(playerClass);
    player.stats
};