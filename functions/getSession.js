const userTemplate = require('../templates/userTemplate');
const bot = require('../bot');

module.exports = async function (sessions, chatId, userId) {
    if (!sessions[chatId]) {
        sessions[chatId] = {};
    }

    if (!sessions[chatId][userId]) {
        sessions[chatId][userId] = {
            userChatData: await bot.getChatMember(chatId, userId),
            user: {...userTemplate}
        };
    }

    return sessions[chatId][userId];
};