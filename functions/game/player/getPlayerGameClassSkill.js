const getPlayerGameClass = require('./getGameClassFromTemplate');

module.exports = function (player, skillNumber) {
    let gameClass = getPlayerGameClass(player.game.gameClass.name);

    return gameClass.skills[skillNumber];
};