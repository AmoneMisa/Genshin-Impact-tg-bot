import bossAlreadySummoned from './bossAlreadySummoned.js';
import getBossesByChatId from '../getters/getBossesByChatId.js';

export default function (chatId) {
    let chatBosses = getBossesByChatId(chatId);

    if (!Array.isArray(chatBosses)) {
        return false;
    }

    return chatBosses.find(bossAlreadySummoned);
}