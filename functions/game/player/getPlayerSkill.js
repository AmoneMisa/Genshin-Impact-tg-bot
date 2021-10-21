const getPlayerClass = require('./getPlayerClass');

module.exports = function (player, skillNumber) {
    let gameClass = getPlayerClass(player.game.gameClass.name);

    return gameClass.skills[skillNumber];
};