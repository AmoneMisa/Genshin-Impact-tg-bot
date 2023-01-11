const getTime = require('../../getters/getTime');
const getRandom = require('../../getters/getRandom');
const getOffset = require('../../getters/getOffset');
const getUserName = require('../../getters/getUserName');

module.exports = function (session) {
    let [remain, hours, minutes, seconds] = getTime(session.timerSwordCallback);

    if (remain > 0) {
        if (hours > 0) {
            return `@${getUserName(session, "nickname")}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${hours} ч ${minutes} мин ${seconds} сек`;
        } else if (minutes > 0) {
            return `@${getUserName(session, "nickname")}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${minutes} мин ${seconds} сек`;
        } else {
            return `@${getUserName(session, "nickname")}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${seconds} сек`;
        }
    }

    session.timerSwordCallback = getOffset();

    if (!session.sword) {
        session.sword = 0;
    }

    let result;
    let int;

    if (session.swordImmune) {
        int = getRandom(0, 15);
        session.swordImmune = false;
    } else if (session.immuneToUpSword) {
        int = getRandom(-10, -1);
        session.immuneToUpSword = false;
    } else {
        int = getRandom(-10, 15);
    }

    session.sword += int;
    if (int > 0) {
        result = `@${getUserName(session, "nickname")}, твой меч увеличился на ${int} мм. Сейчас он равен: ${session.sword} мм`;
    } else {
        result = `@${getUserName(session, "nickname")}, твой меч укоротился на ${int} мм. Сейчас он равен: ${session.sword} мм`;
    }

    return result;
};