import getPlayerGameClass from './getGameClassFromTemplate.js';

export default function (player, skillNumber) {
    let gameClass = getPlayerGameClass(player.game.gameClass.name);

    return gameClass.skills[skillNumber];
};