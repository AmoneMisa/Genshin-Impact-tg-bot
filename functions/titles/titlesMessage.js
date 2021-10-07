module.exports =  function (titles) {
    if (!titles || !titles.length) {
        return "В группе ещё нет ни одного титула. Чтобы получить титул используйте команду /title"
    }

    let str = "";

    for (let title of titles) {
        str += `${title.user}: ${title.title}\n`;
    }

    return str;
};