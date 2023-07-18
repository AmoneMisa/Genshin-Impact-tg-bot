const getEmoji = require('../../getters/getEmoji');

module.exports = function (inventory) {
    let message = `${getEmoji("inventory")} Инвентарь\n\n`;

    for (let [key, item] of Object.entries(inventory)) {
        if (key === "potions") {
            message += getPotionsMessage(inventory[key]);
        } else {
            message += `${getEmoji(key)} ${translateMap[key]}: ${item}\n`;
        }
    }

    return message;
}

function getPotionsMessage(potions) {
    let message = "";
    for (let potion of potions) {
        let findStr = `${potion.bottleType}.${potion.type}`;
        message += `${getEmoji(findStr)} ${potion.name}: ${potion.description}. Количество: ${potion.count}\n`;
    }

    return message;
}

const translateMap = {
    gold: "Золото",
    crystals: "Кристаллы",
    ironOre: "Железная руда",
    potions: "Зелья",
    hp: "Хп"
};