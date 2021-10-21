const getRandom = require('../../getRandom');
const bossDealDamage = require('./bossDealDamage');
const getPlayerClass = require('../../../functions/game/player/getPlayerClass');

module.exports = async function (session, boss, sendMessage) {
    let {skills, stats} = getPlayerClass(session);

    session.game.boss.attackCounter = session.game.boss.attackCounter || 0;

    let criticalChance = 15;

    let isHasCritical = false;
    let dmg;
    let criticalDamageInc;

    if (!session.game.boss.bonus.criticalDamage) {
        criticalDamageInc = 1.5;
    } else {
        criticalDamageInc = 1.5 + 1.5;
        if (session.game.boss.attackCounter === 10) {
            delete session.game.boss.bonus.criticalDamage;
            session.game.boss.attackCounter = 0;
        }
    }

    if (stats.criticalDamage > 0) {
        criticalDamageInc += stats.criticalDamage;
    }

    if (!session.game.boss.bonus.damage) {
        dmg = getRandom(200, 350);
    } else {
        if (session.game.boss.attackCounter === 10) {
            delete session.game.boss.bonus.damage;
        }
        dmg = Math.ceil(getRandom(200, 350) * 1.75);
    }

    if (stats.criticalChance > 0) {
        criticalChance += stats.criticalChance;
    }

    if (!session.game.boss.bonus.criticalChance) {
        if (getRandom(1, 100) <= criticalChance) {
            isHasCritical = true;
            dmg *= criticalDamageInc;
        }
    } else {
        if (getRandom(1, 100) <= criticalChance + 50) {
            isHasCritical = true;
            dmg *= criticalDamageInc;
            if (session.game.boss.attackCounter === 10) {
                console.log("delete");
                delete session.game.boss.bonus.criticalChance;
                session.game.boss.attackCounter = 0;
            }
        }
    }

    if (!boss.damagedHp) {
        boss.damagedHp = 0;
    }

    boss.damagedHp += dmg;
    session.game.boss.damage += dmg;
    let message = await bossDealDamage(session, boss, dmg);

    if (boss.hp <= boss.damagedHp) {
        sendMessage(`${session.userChatData.user.username}, ты нанёс боссу смертельный удар на ${dmg}!\n${message}`);
    } else if (isHasCritical) {
        sendMessage(`${session.userChatData.user.username}, ты нанёс боссу ${dmg} критического урона!\n${message}`);
    } else {
        sendMessage(`${session.userChatData.user.username}, ты нанёс боссу ${dmg} урона.\n${message}`);
    }

    session.game.boss.attackCounter++;

    return true;
};