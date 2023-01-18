const {sessions} = require('../../data');

module.exports = function (chatId) {
    if (!sessions[chatId]) {
        sessions[chatId] = {
            pointPlayers: {}
        };
    }

    return sessions[chatId];
};