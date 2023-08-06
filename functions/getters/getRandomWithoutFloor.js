const lodash = require("lodash");

module.exports = function (min, max) {
    return lodash.round(Math.random() * (max - min + 1) + min, 3);
};