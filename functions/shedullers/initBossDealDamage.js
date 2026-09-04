import bossDealDamage from '../game/boss/bossDealDamage.js';
import getBossDealDamageMessage from '../game/boss/getters/getBossDealDamageMessage.js';
import isBossAlive from '../game/boss/getBossStatus/isBossAlive.js';
import sendMessageWithDelete from '../tgBotFunctions/sendMessageWithDelete.js';
import Boss from '../../db/models/Boss.js';
import getChatSession from '../getters/getChatSession.js';

export default async function() {
    const bosses = await Boss.find({});

    for (let boss of bosses) {
        if (!isBossAlive(boss)) {
            continue;
        }

        let chat = await getChatSession(boss.chatId);
        let dmgList = bossDealDamage(chat.members, boss);

        await chat.save();
        await boss.save();

        if (chat.bossSettings?.showDamageMessage === 0) {
            continue;
        }

        if (dmgList) {
            await sendMessageWithDelete(boss.chatId, getBossDealDamageMessage(dmgList), {
                disable_notification: true
            }, 10 * 1000);
        }
    }
};
