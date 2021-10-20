const getPlayerClass = require('./getPlayerClass');

module.exports = function (player) {
    let gameClass = getPlayerClass(player.game.gameClass.name);

    return gameClass.skills;
};