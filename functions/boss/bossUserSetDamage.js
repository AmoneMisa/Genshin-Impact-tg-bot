const getTime = require('../getTime');

function getOffset() {
    return new Date().getTime() + 4 * 60 * 60 * 1000;
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

    let criticalChance = 15;

    function getRandomDmg(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    let isHasCritical = false;
    let dmg = getRandomDmg(150, 1500);

    if (getRandomDmg(1, 100) <= criticalChance) {
        isHasCritical = true;
        dmg *= 1.5;
    }

    if (!session.game) {
        session.game = {};
        session.game.boss = {};
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