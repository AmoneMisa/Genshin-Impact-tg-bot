const getTime = require('../getTime');
const getRandom = require('../getRandom');
const bossDealDamage = require('./bossDealDamage');

function getOffset() {
    return new Date().getTime() + 60 * 60 * 1000;
}

module.exports = async function (session, boss, sendMessage) {
    if (!boss) {
        sendMessage(`Группа ещё не призвала босса. Призвать можно командой /summon_boss`);
        return false;
    }

    if (boss.hp <= boss.damagedHp) {
        sendMessage(`Лежачих не бьют. Призвать можно командой /summon_boss`).then();
        return false;
    }

    if (session.game.boss.hp <= session.game.boss.damagedHp) {
        sendMessage(`Ты немножко труп. Надо было пить хиллки. Жди следующего призыва босса`);
        return false;
    }

    session.game.boss.attackCounter = session.game.boss.attackCounter || 0;

    let [remain, hours, minutes, seconds] = getTime(session.timerBossCallback);

    if (remain > 0) {
        if (hours > 0) {
            sendMessage(`@${session.userChatData.user.username}, команду можно вызывать раз в час. Осталось: ${hours} ч ${minutes} мин ${seconds} сек`);
        } else if (minutes > 0) {
            sendMessage(`@${session.userChatData.user.username}, команду можно вызывать раз в час. Осталось: ${minutes} мин ${seconds} сек`);
        } else {
            sendMessage(`@${session.userChatData.user.username}, команду можно вызывать раз в час. Осталось: ${seconds} сек`);
        }

        return false;
    }

    session.timerBossCallback = getOffset();

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

    if (!session.game.boss.bonus.damage) {
        dmg = getRandom(200, 350);
    } else {
        if (session.game.boss.attackCounter === 10) {
            delete session.game.boss.bonus.damage;
        }
        dmg = Math.floor(getRandom(200, 350) / 0.75);
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