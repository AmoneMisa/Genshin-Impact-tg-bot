import bot from '../../../../bot.js';
import getRandom from '../../../getters/getRandom.js';

export default async function (bossSkill, chatId) {
    let countChatMembers = await bot.getChatMemberCount(chatId);
    let maxHp = countChatMembers * 6780;
    let hp = getRandom(maxHp * 3.75, maxHp);

    if (bossSkill.effect.includes("rage")) {
        hp = hp / 2;
    }

    return hp;
}