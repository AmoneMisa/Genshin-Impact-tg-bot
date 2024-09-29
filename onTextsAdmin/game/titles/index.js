const clearTitlesList = require('./clearTitlesList');
const receiveTitleTimerForUser = require('./receiveTitleTimerForUser');

module.exports = [
    ...clearTitlesList,
    ...receiveTitleTimerForUser
];