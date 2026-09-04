import getStringRemainTime from "../../getters/getStringRemainTime.js";
import getUserName from "../../getters/getUserName.js";
import getChatSession from "../../getters/getChatSession.js";
import getSession from "../../getters/getSession.js";
import { rollSword } from "./swordCore.js";

/**
 * Логика команды "меч" — можно вызывать раз в сутки.
 * Правила изменения длины общие для legacy-команды и Mini App.
 */
export default async function(chatId, userId) {
    const chat = await getChatSession(chatId);
    const member = await getSession(chatId, userId);
    const result = rollSword(member);

    if (!result.ok) {
        return `@${await getUserName(userId, "nickname")}, команду можно вызывать раз в сутки. Обновляется попытка в 00.00. Осталось: ${getStringRemainTime(result.sword.remainMs)}`;
    }

    await chat.save();

    const username = await getUserName(member, "nickname");
    if (result.delta > 0) {
        return `@${username}, твой меч увеличился на ${result.delta} мм. Сейчас он равен: ${result.sword.length} мм`;
    }
    if (result.delta < 0) {
        return `@${username}, твой меч укоротился на ${Math.abs(result.delta)} мм. Сейчас он равен: ${result.sword.length} мм`;
    }
    return `@${username}, твой меч сегодня не изменился. Сейчас он равен: ${result.sword.length} мм`;
}
