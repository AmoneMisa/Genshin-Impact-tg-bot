const getOffset = require('../../getters/getOffset');
const deleteMessage = require('../../../functions/tgBotFunctions/deleteMessage');

module.exports = function (session, callback) {
    if (session.chestCounter > 2) {
        session.timerOpenChestCallback = getOffset();
        session.chestCounter = 0;
        session.chosenChests = [];
        session.chestButtons = [];
        return deleteMessage(callback.message.chat.id, callback.message.message_id);
    }
};