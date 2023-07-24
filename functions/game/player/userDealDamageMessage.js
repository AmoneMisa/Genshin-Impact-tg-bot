const isBossAlive = require("../boss/getBossStatus/isBossAlive");
const bossReflectDamageMessage = require("../boss/bossReflectDamageMessage");
const getUserName = require("../../getters/getUserName");

module.exports = function (session, boss, {isHasCritical = false, dmg = 0, vampire = false, reflectDamage = false}) {
    let message = "";

    if (vampire) {
        message += `Ты отвампирил себе ${vampire} хп. Твоё текущее хп: ${session.game.gameClass.stats.hp}\n`;
    }

    if (reflectDamage) {
        message += bossReflectDamageMessage(reflectDamage, session.game.gameClass.stats.hp);
    }

    if (!isBossAlive(boss)) {
        return `@${getUserName(session, "nickname")}, ты нанёс боссу смертельный удар на ${dmg}!\n${message}`;
    } else if (isHasCritical) {
        return `@${getUserName(session, "nickname")}, ты нанёс боссу ${dmg} критического урона!\n${message}`;
    } else {
        return `@${getUserName(session, "nickname")}, ты нанёс боссу ${dmg} урона.\n${message}`;
    }
}