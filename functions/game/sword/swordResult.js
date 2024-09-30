import getTime from '../../getters/getTime.js';
import getRandom from '../../getters/getRandom.js';
import getOffset from '../../getters/getOffset.js';
import getStringRemainTime from '../../getters/getStringRemainTime.js';
import getUserName from '../../getters/getUserName.js';

export default function (session) {
    let [remain] = getTime(session.timerSwordCallback);

    if (remain > 0) {
        return `@${getUserName(session, "nickname")}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${getStringRemainTime(remain)}`;
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