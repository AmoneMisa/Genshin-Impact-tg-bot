const infoCallbacks = require('./info');
const personalInfoCallback = require('./personalInfo');

module.exports = [
    ...personalInfoCallback,
    ...infoCallbacks
];