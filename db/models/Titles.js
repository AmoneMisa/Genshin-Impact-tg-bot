import Title from "../../db/models/Title.js";

/**
 * Возвращает список титулов для конкретного чата.
 * Если титулов нет, возвращает пустой массив.
 */
export default async function getTitles(chatId) {
    const titles = await Title.find({ chatId });
    return titles || [];
}
