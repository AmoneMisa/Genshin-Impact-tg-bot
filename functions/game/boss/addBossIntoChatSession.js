import getBossByName from './getters/getBossByName.js';
import getBossesByChatId from './getters/getBossesByChatId.js';

export default function (chatId, boss) {
    let chatBosses = getBossesByChatId(chatId);

    if (getBossByName(chatId, boss.name)) {
        throw new Error(`Босс с таким именем: ${boss.name} уже есть в чате с айди: ${chatId}`);
    }

    chatBosses.push(boss);
}