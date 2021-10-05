module.exports =  function (titles) {
    let str = "";

    for (let title of Object.values(titles)) {
        str += `${title.user}: ${title.title}\n`;
    }

    return str;
};