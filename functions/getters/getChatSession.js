const {sessions} = require('../../data');

module.exports = function (chatId) {
    if (!sessions[chatId]) {
        sessions[chatId] = {
            game: {
                points: {},
                elements: {}
            }
        };
    }

    if (!sessions[chatId].hasOwnProperty("game")) {
        sessions[chatId].game = {points: {}, elements: {}};
    }

    return sessions[chatId];
};