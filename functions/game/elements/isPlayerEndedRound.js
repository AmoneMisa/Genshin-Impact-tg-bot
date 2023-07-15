module.exports = function (player, currentRound) {
    if (player.counter > currentRound) {
        throw new Error("player.counter больше, чем текущий раунд");
    }

    return player.counter === currentRound;
}