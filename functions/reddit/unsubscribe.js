const getChatSession = require("../getters/getChatSession");
const stopGettingPosts = require("./stopGettingPosts");

module.exports = function (name, session, chatId) {
    let chatSession = getChatSession(chatId);

    if (!chatSession.reddit) {
        chatSession.reddit = {};

        return false;
    }

    if (!chatSession.reddit.subscribes) {
        chatSession.reddit.subscribes = [];

        return false;
    }

    chatSession.reddit.subscribes[name]--;

    if (chatSession.reddit.subscribes[name] <= 0) {
        delete chatSession.reddit.subscribes[name];
    }

    if (session.reddit.subscribes.hasOwnProperty(name)) {
        delete session.reddit.subscribes[name];
        stopGettingPosts(name, session);
        return true;
    }
    return false;
};
