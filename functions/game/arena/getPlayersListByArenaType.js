import ArenaRating from "../../../db/models/ArenaRating.js";
import getSession from "../../getters/getSession.js";
import getUserName from "../../getters/getUserName.js";
import updateRank from "./updateRank.js";

const pageSize = 25;

/**
 * Формирует таблицу рейтинга арены
 * @param {String} arenaType - "common" или "expansion"
 * @param {Number} page - номер страницы
 * @param {Number} chatId - ID чата (для common)
 */
export default async function(arenaType, page = 1, chatId) {
    let message = "";
    let counter = page === 1 ? 1 : pageSize * page;

    // 1. Получаем список рейтингов из базы
    let ratings;
    if (arenaType === "common") {
        ratings = await ArenaRating.find({ chatId, mode: "common" });
    } else {
        ratings = await ArenaRating.find({ mode: "expansion" });
    }

    // 2. Сортируем по рейтингу
    let sortedRating = ratings
        .map(r => [r.userId, r.rating, r.chatId])
        .sort((a, b) => b[1] - a[1]);

    // 3. Делаем постраничный вывод
    let start = page === 1 ? 0 : (page - 1) * pageSize;
    let end = page * pageSize;
    let requestedRating = sortedRating.slice(start, end);

    // 4. Формируем сообщение
    for (let [userId, rating, userChatId] of requestedRating) {
        // для expansion берём chatId из записи
        const session = await getSession(arenaType === "expansion" ? userChatId : chatId, userId);
        const name = await getUserName(userId, "name");
        const rank = await updateRank(userId, arenaType, chatId);

        message += `${counter}. ${name} (Рейтинг ${rating} | Ранг: ${rank})\n`;
        counter++;
    }

    return message;
}
