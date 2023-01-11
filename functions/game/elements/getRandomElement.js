const elements = require('../../../templates/elements');
const getRandom = require('../../getters/getRandom');

module.exports = function () {
    return elements[getRandom(0, Object.keys(elements).length - 1)];
};