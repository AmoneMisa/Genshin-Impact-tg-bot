module.exports = function (points, minWin, maxWin) {
    return minWin <= points && points <= maxWin;
};