const whoami = require('./whoami');
const changeGender = require('./changeGender');
const stealResources = require('./stealResources');

module.exports = [
    ...whoami,
    ...stealResources,
    ...changeGender
];