const getTime = require('../getTime');
const getRandom = require('../getRandom');

function getOffset() {
    // return new Date().getTime() + 4 * 60 * 60 * 1000;
    return new Date().getTime() + 60;
}

module.exports = function (session, boss, sendMessage) {
    if (!boss) {
        sendMessage(`Группа ещё не призвала босса. Призвать можно командой /summon_boss`);
        return false;
    }

    if (boss.hp <= boss.damagedHp) {
        sendMessage(`Лежачих не бьют.`);
        return false;
    }

    let [remain, hours, minutes, seconds] = getTime(session.timerBossCallback);

    if (remain > 0) {
        if (hours > 0) {
            sendMessage(`@${session.userChatData.user.username}, команду можно вызывать раз в 4 часа. Осталось: ${hours} ч ${minutes} мин ${seconds} сек`);
        } else if (minutes > 0) {
            sendMessage(`@${session.userChatData.user.username}, команду можно вызывать раз в 4 часа. Осталось: ${minutes} мин ${seconds} сек`);
        } else {
            sendMessage(`@${session.userChatData.user.username}, команду можно вызывать раз в 4 часа. Осталось: ${seconds} сек`);
        }

        return false;
    }

    session.timerBossCallback = getOffset();

    if (!session.game) {
        session.game = {};
        session.game.inventory = {};
        session.game.inventory.gold = 0;
        session.game.boss = {};
        session.game.boss.bonus = {};
    }

    let criticalChance = 15;

    let isHasCritical = false;
    let dmg;
    let criticalDamageInc;

    if (!session.game.boss || !session.game.boss.bonus || !session.game.boss.bonus.criticalDamage) {
        criticalDamageInc = 1.5;
    } else {
        criticalDamageInc = session.game.boss.bonus.criticalDamage + 1.5;
        delete session.game.boss.bonus.criticalDamage;
    }

    if (!session.game.boss || !session.game.boss.bonus || !session.game.boss.bonus.damage) {
        dmg = getRandom(150, 400);
    } else {
        delete session.game.boss.bonus.damage;
        dmg = Math.floor(getRandom(150, 400) / 0.75);
    }

    if (!session.game.boss || !session.game.boss.bonus || !session.game.boss.bonus.criticalChance) {
        if (getRandom(1, 100) <= criticalChance) {
            isHasCritical = true;
            dmg *= criticalDamageInc;
        }
    } else {
        if (getRandom(1, 100) <= criticalChance + session.game.boss.bonus.criticalChance) {
            isHasCritical = true;
            dmg *= criticalDamageInc;
            delete session.game.boss.bonus.criticalChance;
        }
    }

    if (!session.game.boss.damage) {
        session.game.boss.damage = 0;
    }

    if (!boss.damagedHp) {
        boss.damagedHp = 0;
    }

    boss.damagedHp += dmg;
    session.game.boss.damage += dmg;

    if (boss.hp <= boss.damagedHp) {
        sendMessage(`Ты нанёс боссу смертельный удар на ${dmg}!`);
    } else if (isHasCritical) {
        sendMessage(`Ты нанёс боссу ${dmg} критического урона!`);
    } else {
        sendMessage(`Ты нанёс боссу ${dmg} урона.`);
    }

    return true;
};