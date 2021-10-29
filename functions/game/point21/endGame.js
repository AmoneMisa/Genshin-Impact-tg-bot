const botThink = require('../../../functions/game/point21/botThink');
const getWinners = require('../../../functions/game/point21/getWinners');
const bot = require('../../../bot');
const deleteMessageTimeout = require('../../../functions/deleteMessageTimeout');
const sendMessage = require('../../../functions/sendMessage');

module.exports = function (chatSession, callback) {
    botThink(chatSession);
    chatSession.pointIsStart = false;
    chatSession.pointGameSessionIsStart = false;

    bot.deleteMessage(callback.message.chat.id, callback.message.message_id);

    sendMessage(callback.message.chat.id, getWinners(chatSession))
        .then(message => {
            deleteMessageTimeout(callback.message.chat.id, message.message_id, 15 * 1000);
        });

    chatSession.pointPlayers = {};
    chatSession.pointUsedCards = [];
};