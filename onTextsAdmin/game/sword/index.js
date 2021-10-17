let receiveSwordTimerForUser = require('./receiveSwordTimerForUser');
let resetSwordTimers = require('./resetSwordTimers');

module.exports = [
    ...receiveSwordTimerForUser,
    ...resetSwordTimers
];