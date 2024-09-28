const getWinners = require('./getWinners');
const deleteMessage = require('../../../functions/tgBotFunctions/deleteMessage');
const sendMessageWithDelete = require('../../tgBotFunctions/sendMessageWithDelete');

module.exports = function (winners, chatId, messageId, isDefault = true, gameName) {
    if (isDefault) {
        deleteMessage(chatId, messageId);
    }

    return sendMessageWithDelete(chatId, getWinners(winners, gameName), {
        ...(callback.message.message_thread_id ? {message_thread_id: callback.message.message_thread_id} : {})
    }, 60 * 1000);
};