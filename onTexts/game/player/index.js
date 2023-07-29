const whoami = require('./whoami');
const stealResources = require('./stealResources');

module.exports = [
    ...whoami,
    ...stealResources
];