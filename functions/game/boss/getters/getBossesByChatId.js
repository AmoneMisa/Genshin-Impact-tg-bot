const {bosses} = require("../../../../data");

module.exports = function (chatId) {
    if (!bosses[chatId]) {
        bosses[chatId] = [];
    }

    return bosses[chatId];
}