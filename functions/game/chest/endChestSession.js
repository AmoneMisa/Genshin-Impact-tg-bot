const getOffset = require('../../getters/getOffset');
const deleteMessageTimeout = require('../../../functions/tgBotFunctions/deleteMessageTimeout');

module.exports = function (session, callback) {
    if (session.chestCounter > 2) {
        session.chestCounter = 0;
        session.chosenChests = [];
        session.chestButtons = [];
        session.chestTries = 0;
        deleteMessageTimeout(callback.message.chat.id, callback.message.message_id, 15 * 1000);
    }
};