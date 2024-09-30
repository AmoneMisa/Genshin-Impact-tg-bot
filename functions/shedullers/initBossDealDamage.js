import getMembers from '../getters/getMembers.js';
import bossDealDamage from '../game/boss/bossDealDamage.js';
import getBossDealDamageMessage from '../game/boss/getters/getBossDealDamageMessage.js';
import isBossAlive from '../game/boss/getBossStatus/isBossAlive.js';
import sendMessageWithDelete from '../tgBotFunctions/sendMessageWithDelete.js';
import { bosses, sessions } from '../../data.js';

export default async function () {
    for (let [chatId, bossesArray] of Object.entries(bosses)) {
        for (let boss of bossesArray) {
            if (!isBossAlive(boss)) {
                continue;
            }

            let members = getMembers(chatId);
            let dmgList = bossDealDamage(members, boss);

            if (sessions[chatId].bossSettings.showDamageMessage === 0) {
                continue;
            }

            if (dmgList) {
                await sendMessageWithDelete(chatId, getBossDealDamageMessage(dmgList), {
                    disable_notification: true
                }, 10 * 1000);
            }
        }
    }
};