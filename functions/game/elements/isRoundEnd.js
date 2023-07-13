module.exports = function (players, currentRound) {
    let playersEndedRound = [];
    for (let [playerId, player] of Object.entries(players)) {
        if (playerId === "bot") {
            continue;
        }

        if (player.counter === currentRound) {
            playersEndedRound.push(player);
        }
    }

    return playersEndedRound.length === Object.keys(players ).length - 1;
}