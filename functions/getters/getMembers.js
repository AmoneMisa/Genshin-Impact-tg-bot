import getChatSession from './getChatSession.js';

export default function (chatId) {
    let chatSession = getChatSession(chatId);

    if (!chatSession['members']) {
        chatSession['members'] = {};
    }

    return chatSession['members'];
};