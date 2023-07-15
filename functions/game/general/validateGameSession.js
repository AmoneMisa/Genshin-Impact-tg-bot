module.exports = function (game, userId, gameName) {
    if (!game.isStart) {
        return false;
    }

    if (!game.players[userId]) {
        return false;
    }

    if (gameName !== "elements") {
        return !game.players[userId].isPass;
    }

    return true;
};