/**
 * Формирует строку со списком титулов
 * @param {string[]} titles - массив титулов
 * @returns {string}
 */
export default function formatTitles(titles) {
    if (!Array.isArray(titles) || titles.length === 0) {
        return "В группе ещё нет ни одного титула. Чтобы получить титул используйте команду /title [название титула, введённое вручную]";
    }

    return titles.join("\n");
}
