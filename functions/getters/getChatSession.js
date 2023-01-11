const {sessions} = require('../../data');

module.exports = function (chatId) {
    if (!sessions[chatId]) {
        sessions[chatId] = {};
    }

    return sessions[chatId];
};