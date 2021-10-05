const userTemplate = require('../userTemplate');
const bot = require('../bot');

module.exports = function (sessions, chatId, userId) {
    if (!sessions[userId]) {
        sessions[userId] = {
            userChatData: (sessions[userId] && sessions[userId].userChatData) || getUserData(),
            user: (sessions[userId] && sessions[userId].user) || {...userTemplate}
        };
        return sessions[userId];
    }

    function getUserData() {
        bot.getChatMember(chatId, userId)
            .then((user) => {
                sessions[userId].userChatData = user;
            })
            .catch(e => console.error(e));
    }

    return sessions[userId];
};