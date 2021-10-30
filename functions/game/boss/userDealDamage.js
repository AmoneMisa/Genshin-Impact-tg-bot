const bossReflectDamage = require('./bossReflectDamage');
const mathDamage = require('../../../functions/game/boss/mathDamage');

module.exports = async function (session, boss, sendMessage, skill) {
    try {
        session.game.boss.attackCounter = session.game.boss.attackCounter || 0;

        if (!boss.damagedHp) {
            boss.damagedHp = 0;
        }

        let {dmg, isHasCritical} = mathDamage(session, skill);

        boss.damagedHp += dmg;
        session.game.boss.damage += dmg;
        let message = "";

        if (boss.skill.effect.includes("reflect") || boss.skill.effect.includes("rage")) {
            message += await bossReflectDamage(session, boss, dmg);
        }

        if (boss.hp <= boss.damagedHp) {
            sendMessage(`${session.userChatData.user.username}, ты нанёс боссу смертельный удар на ${dmg}!\n${message}`);
        } else if (isHasCritical) {
            sendMessage(`${session.userChatData.user.username}, ты нанёс боссу ${dmg} критического урона!\n${message}`);
        } else {
            sendMessage(`${session.userChatData.user.username}, ты нанёс боссу ${dmg} урона.\n${message}`);
        }

        session.game.boss.attackCounter++;

        return true;
    } catch (e) {
        console.error(e);
    }
};