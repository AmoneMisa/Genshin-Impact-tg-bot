const lodash = require("lodash");

module.exports = function (min, max) {
    return lodash.round(min + Math.random() * (max - min), 3);
};