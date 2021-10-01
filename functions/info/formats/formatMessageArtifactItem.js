module.exports = function (item) {
    if (item.hasOwnProperty("1-piece_bonus")) {
        return `${item.name}\n${item[1-piece_bonus]}`;
    }
    return `${item.name}\n${item[2-piece_bonus]}\n${item[4-piece_bonus]}`;
};