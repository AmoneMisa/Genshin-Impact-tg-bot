const bossReflectDamage = require('./bossReflectDamage');
const mathDamage = require('../../../functions/game/boss/mathDamage');
const userVampireSkill = require('../../../functions/game/boss/userVampireSkill');

module.exports = async function (session, boss, sendMessage, skill) {
    try {
        session.game.boss.attackCounter = session.game.boss.attackCounter || 0;
        let message = "";

        if (!boss.damagedHp) {
            boss.damagedHp = 0;
        }

        let {dmg, isHasCritical} = mathDamage(session, skill);

        if (skill.effect.includes("vampire")) {
            let vampire = userVampireSkill(skill, dmg);
            session.game.boss.damagedHp -= vampire;
            if (session.game.boss.hp <= session.game.boss.damagedHp || session.game.boss.damagedHp < 0) {
                session.game.boss.damagedHp = 0;
            }
            message += `Ты отвампирил себе ${vampire} хп. Твоё текущее хп: ${session.game.boss.damagedHp}`;
        }

        boss.damagedHp += dmg;
        session.game.boss.damage += dmg;

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