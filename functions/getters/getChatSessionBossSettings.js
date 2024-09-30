import getChatSession from './getChatSession.js';

export default function (chatId) {
    let chatSession = getChatSession(chatId);
    if (!chatSession.hasOwnProperty("bossSettings")) {
        chatSession.bossSettings = {
            // 1 - on
            // 0 - off
            bossDealDamageMessage: 1,
            showHealMessage: 1
        };
    }

    return chatSession.bossSettings;
};