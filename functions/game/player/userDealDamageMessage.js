import isBossAlive from '../boss/getBossStatus/isBossAlive.js';
import bossReflectDamageMessage from '../boss/bossReflectDamageMessage.js';
import getUserName from '../../getters/getUserName.js';
import getCurrentHp from './getters/getCurrentHp.js';

export default async function (session, boss, {
    isHasCritical = false,
    dmg = 0,
    vampire = false,
    reflectDamage = false
}) {
    let message = "";
    let currentHp = getCurrentHp(session);

    if (vampire) {
        message += `Ты отвампирил себе ${vampire} хп. Твоё текущее хп: ${currentHp}\n`;
    }

    if (reflectDamage) {
        message += bossReflectDamageMessage(reflectDamage, currentHp);
    }

    if (!isBossAlive(boss)) {
        return `@${await getUserName(session, "nickname")}, ты нанёс боссу смертельный удар на ${dmg}!\n${message}`;
    } else if (isHasCritical) {
        return `@${await getUserName(session, "nickname")}, ты нанёс боссу ${dmg} критического урона!\n${message}`;
    } else {
        return `@${await getUserName(session, "nickname")}, ты нанёс боссу ${dmg} урона.\n${message}`;
    }
}