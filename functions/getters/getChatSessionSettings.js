import getChatSession from './getChatSession.js';

export default function (chatId) {
    let chatSession = getChatSession(chatId);
    let settingsTemplate = {
        // 1 - on
        // 0 - off
        dice: 1,
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
        horoscope: 1,
        bonus: 1
    };

    return Object.assign({}, settingsTemplate, chatSession.settings);
};