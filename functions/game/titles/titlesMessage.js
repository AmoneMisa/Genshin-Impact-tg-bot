export default function (titles) {
    if (!titles || !titles.length) {
        return "В группе ещё нет ни одного титула. Чтобы получить титул используйте команду /title [название титула, введённое вручную]";
    }

    let str = "";

    for (let title of titles) {
        str += `${title}\n`;
    }

    return str;
};