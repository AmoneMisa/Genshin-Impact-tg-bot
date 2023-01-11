const {myId} = require('../../config');
const sendMessage = require('./sendMessage');

module.exports = function (message) {
    if (typeof message !== "string") {
        message = JSON.stringify(message, null, 4);
    }
    sendMessage(myId, message);
};