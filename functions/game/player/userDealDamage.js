const bossReflectDamage = require('../boss/bossReflectDamage');
const calcDamage = require('../boss/calcDamage');
const isBossDead = require('../boss/isBossDead');
const userVampireSkill = require('./userVampireSkill');
const getUserName = require('../../getters/getUserName');

module.exports = async function (session, boss, sendMessage, skill) {
    let message = "";

    if (!boss.currentHp) {
        boss.currentHp = boss.hp;
    }

    let {dmg, isHasCritical} = calcDamage(session, skill, boss);

    if (skill.effect.includes("vampire")) {
        let vampire = userVampireSkill(skill, dmg);
        session.game.stats.currentHp += vampire;
        if (session.game.stats.currentHp <= 0) {
            session.game.stats.currentHp = 0;
        }
        message += `Ты отвампирил себе ${vampire} хп. Твоё текущее хп: ${session.game.stats.currentHp}`;
    }

    boss.currentHp -= dmg;
    boss.listOfDamage[session.userChatData.user.id].damage += dmg;

    if (boss.skill.effect.includes("reflect") || boss.skill.effect.includes("rage")) {
        message += bossReflectDamage(session, boss, dmg);
    }

    if (isBossDead(boss)) {
        sendMessage(`${getUserName(session, "nickname")}, ты нанёс боссу смертельный удар на ${dmg}!\n${message}`);
    } else if (isHasCritical) {
        sendMessage(`${getUserName(session, "nickname")}, ты нанёс боссу ${dmg} критического урона!\n${message}`);
    } else {
        sendMessage(`${getUserName(session, "nickname")}, ты нанёс боссу ${dmg} урона.\n${message}`);
    }
    return true;
};