import bot from '../../../../bot.js';
import computeBossHp from '../bossHp.js';

export default async function(bossSkill, chatId, bossTemplate) {
    let countChatMembers = await bot.getChatMemberCount(chatId);
    return computeBossHp({members: countChatMembers, template: bossTemplate, skillEffect: bossSkill.effect});
}
