import getBossesByChatId from './getBossesByChatId.js';

export default async function (chatId, bossName) {
    let chatBosses = await getBossesByChatId(chatId);
    return chatBosses.find(boss => boss.name === bossName);
}