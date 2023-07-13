module.exports = function (player, currentRound) {
    if (player.counter === currentRound) {
        return true;
    }

    if (player.counter < currentRound) {
        return false
    }
}