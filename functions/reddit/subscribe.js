const getChatSession = require("../getters/getChatSession");

module.exports = function (id, name, session, chatId) {
    let chatSession = getChatSession(chatId);

    if (!chatSession.reddit) {
        chatSession.reddit = {};
    }

    if (!chatSession.reddit.subscribes) {
        chatSession.reddit.subscribes = [];
    }

    if (session.reddit.subscribes.hasOwnProperty(id)) {
        return false;
    }


    if (!chatSession.reddit.subscribes[id]) {
        chatSession.reddit.subscribes[id] = 1;
    } else {
        chatSession.reddit.subscribes[id]++;
    }

    session.reddit.subscribes[id] = {
        name: "",
        timer: 2,
        isStart: true
    };
    return true;
};
