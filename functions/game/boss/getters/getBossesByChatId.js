import Boss from "../../../../db/models/Boss.js";

/**
 * Возвращает список боссов для конкретного чата.
 * Если боссов нет, возвращает пустой массив.
 */
export default async function getBosses(chatId) {
    const bosses = await Boss.find({ chatId });
    return bosses || [];
}
