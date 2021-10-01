const menuCallbacks = require('./menu');
const infoCallbacks = require('./info');
const personalInfoCallback = require('./personalInfo');
const menuItemCallbacks = require('./menuItem');

module.exports = [
    ...personalInfoCallback,
    ...menuCallbacks,
    ...menuItemCallbacks,
    ...infoCallbacks
];