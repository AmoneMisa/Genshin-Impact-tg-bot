module.exports = function (skittlesPoints, minWin, maxWin) {
    return minWin <= skittlesPoints && skittlesPoints <= maxWin;
};