const getOffset = require('../../../functions/getOffset');
const bot = require('../../../bot');

module.exports = function (session, callback) {
    if (session.chestCounter > 2) {
        session.timerOpenChestCallback = getOffset();
        session.chestCounter = 0;
        session.chosenChests = [];
        session.chestButtons = [];
        bot.deleteMessage(callback.message.chat.id, callback.message.message_id);
    }
};