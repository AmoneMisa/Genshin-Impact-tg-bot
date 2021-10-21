const getGameClass = require('./getGameClass');

module.exports = function (session, playerClass) {
    let player = session.game;
    if (player.hasOwnProperty("gameClass")) {
        return;
    }

    player.gameClass = getGameClass(playerClass);

    for (let [key, value] of Object.entries(player.gameClass)) {
        player.gameClass[key] = value;
    }
};