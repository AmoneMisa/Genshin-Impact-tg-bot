const emoji = require("../../dictionaries/emoji");

module.exports = function (emojiName) {
    if (!emojiName) {
        throw new Error(`Название для эмодзи: ${emojiName}`);
    }

    try {
        return emoji.find(em => em.type === emojiName).emoji;
    } catch (e) {
        throw new Error(`Эмодзи с таким ключом не найдено: ${emojiName} >>> ${e}`);
    }
}