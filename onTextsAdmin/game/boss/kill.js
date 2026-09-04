import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
import getMemberStatus from '../../../functions/getters/getMemberStatus.js';
import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
import getBossesByChatId from '../../../functions/game/boss/getters/getBossesByChatId.js';
import bossAlreadySummoned from '../../../functions/game/boss/getBossStatus/bossAlreadySummoned.js';

export default [[/(?:^|\s)\/kill\b/, async (msg) => {
    await deleteMessage(msg.chat.id, msg.message_id);

    if (!await getMemberStatus(msg.chat.id, msg.from.id)) {
        return;
    }

    const bosses = await getBossesByChatId(msg.chat.id);
    let boss = Array.isArray(bosses) ? bosses.find(bossAlreadySummoned) : null;
    if (!boss) {
        throw new Error(`Не найден босс для команды kill в чате: ${msg.chat.id}`);
    }

    if (boss.currentHp === 0) {
        throw new Error(`Босс уже мёртв: ${msg.chat.id}`);
    }

    boss.skill = null;
    boss.currentHp = 0;
    boss.hp = 0;
    boss.listOfDamage = [];
    await boss.save();

    return sendMessageWithDelete(msg.chat.id, "Босс убит админом.", {
        ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
        disable_notification: true
    }, 5 * 1000);
}]];