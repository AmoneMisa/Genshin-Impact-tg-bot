const getChatSession = require('./getChatSession');

module.exports = function (chatId) {
    let chatSession = getChatSession(chatId);
    if (!chatSession.hasOwnProperty("settings")) {
        chatSession.settings = {
            // 1 - on
            // 0 - off
            dices: 1,
            chests: 1,
            boss: 1,
            form: 1,
            sendGold: 1,
            points: 1,
            elements: 1,
            bowling: 1,
            football: 1,
            basketball: 1,
            darts: 1,
            slots: 1,
            swords: 1,
            titles: 1,
            whoami: 1,
            mute: 1,
            horoscope: 1
        };
    }

    return chatSession.settings;
};