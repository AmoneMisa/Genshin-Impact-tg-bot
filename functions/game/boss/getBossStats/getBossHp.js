import bot from '../../../../bot.js';
import computeBossHp from '../bossHp.js';

export default async function(bossSkill, chatId, bossTemplate, memberCount = null) {
    // a clan boss counts the clan, a chat boss the Telegram chat
    let countChatMembers = memberCount ?? await bot.getChatMemberCount(chatId);
    return computeBossHp({members: countChatMembers, template: bossTemplate, skillEffect: bossSkill.effect});
}
