const userTemplate = require('../userTemplate');
const bot = require('../bot');

module.exports = async function (sessions, chatId, userId) {
    if (!sessions[userId]) {
        sessions[userId] = {
            userChatData: (sessions[userId] && sessions[userId].userChatData) || await bot.getChatMember(chatId, userId),
            user: (sessions[userId] && sessions[userId].user) || {...userTemplate}
        };

        return sessions[userId];
    }

    return sessions[userId];
};