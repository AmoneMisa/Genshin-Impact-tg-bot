import getBossesByChatId from './getBossesByChatId.js';

export default function (chatId, bossName) {
    let chatBosses = getBossesByChatId(chatId);
    return chatBosses.find(boss => boss.name === bossName);
}