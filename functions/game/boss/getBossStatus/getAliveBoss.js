import bossAlreadySummoned from './bossAlreadySummoned.js';
import getBossesByChatId from '../getters/getBossesByChatId.js';

export default async function (chatId) {
    let chatBosses = await getBossesByChatId(chatId);

    if (!Array.isArray(chatBosses)) {
        return false;
    }

    return chatBosses.find(bossAlreadySummoned);
}