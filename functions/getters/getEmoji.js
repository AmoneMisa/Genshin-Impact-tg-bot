import emoji from '../../dictionaries/emoji.js';

export default function (emojiName) {
    // if (!emojiName) {
    //     throw new Error(`Название для эмодзи: ${emojiName}`);
    // }

    if (!emojiName) {
        return "";
    }
    try {
        return emoji.find(em => em.type === emojiName).emoji;
    } catch (e) {
        // throw new Error(`Эмодзи с таким ключом не найдено: ${emojiName} >> ${e}`);
        return "";
    }
}