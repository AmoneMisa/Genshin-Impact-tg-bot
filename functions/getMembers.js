let getChatSession = require('./getChatSession');

module.exports = function (chatId) {
    let chatSession = getChatSession(chatId);

    if (!chatSession['members']) {
        chatSession['members'] = {};
    }

    return chatSession['members'];
};