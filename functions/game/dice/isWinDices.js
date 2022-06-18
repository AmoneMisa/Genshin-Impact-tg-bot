module.exports = function (dicePoints, minWin, maxWin) {
    return minWin <= dicePoints && dicePoints <= maxWin;
};