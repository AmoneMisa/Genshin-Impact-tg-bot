const getGameClass = require('./getGameClass');

module.exports = function (session, playerClass) {
    // if (session.game.hasOwnProperty("gameClass")) {
    //     return;
    // }

    session.game.gameClass = getGameClass(playerClass);
};