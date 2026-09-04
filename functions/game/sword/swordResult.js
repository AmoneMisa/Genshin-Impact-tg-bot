import getTime from "../../getters/getTime.js";
import getRandom from "../../getters/getRandom.js";
import getOffset from "../../getters/getOffset.js";
import getStringRemainTime from "../../getters/getStringRemainTime.js";
import getUserName from "../../getters/getUserName.js";
import getChatSession from "../../getters/getChatSession.js";
import getSession from "../../getters/getSession.js";

/**
 * Логика команды "меч" — можно вызывать раз в сутки
 * @param {string} chatId - идентификатор чата
 * @param {string} userId - идентификатор игрока
 * @returns {string} сообщение для игрока
 */
export default async function(chatId, userId) {
    const chat = await getChatSession(chatId);
    const member = await getSession(chatId, userId);
    const [remain] = getTime(member.timerSwordCallback);

    if (remain > 0) {
        return `@${await getUserName(userId, "nickname")}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${getStringRemainTime(remain)}`;
    }

    member.timerSwordCallback = getOffset();

    if (!member.sword) {
        member.sword = 0;
    }

    let int;
    if (member.swordImmune) {
        int = getRandom(0, 15);
        member.swordImmune = false;
    } else if (member.immuneToUpSword) {
        int = getRandom(-10, -1);
        member.immuneToUpSword = false;
    } else {
        int = getRandom(-10, 15);
    }

    member.sword += int;

    await chat.save();

    if (int > 0) {
        return `@${await getUserName(member, "nickname")}, твой меч увеличился на ${int} мм. Сейчас он равен: ${member.sword} мм`;
    } else {
        return `@${await getUserName(member, "nickname")}, твой меч укоротился на ${int} мм. Сейчас он равен: ${member.sword} мм`;
    }
}
