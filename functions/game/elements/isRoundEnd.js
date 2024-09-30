import isPlayerEndedRound from './isPlayerEndedRound.js';

export default function (players, currentRound) {
    for (let [playerId, player] of Object.entries(players)) {
        if (playerId === "bot") {
            continue;
        }

        if (!isPlayerEndedRound(player, currentRound)) {
            return false;
        }
    }

    return true;
}