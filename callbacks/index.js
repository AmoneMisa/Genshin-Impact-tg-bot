const monstersCallbacks = require('./info');
const languageCallback = require('./language');

module.exports = [
    ...monstersCallbacks,
    ...languageCallback
];