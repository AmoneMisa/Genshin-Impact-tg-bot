module.exports = function (min, max) {
    return (Math.random() * (max - min + 1) + min).toFixed(3);
};