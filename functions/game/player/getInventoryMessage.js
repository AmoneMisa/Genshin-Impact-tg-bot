const getEmoji = require('../../getters/getEmoji');

module.exports = function (inventory, isSoloItem = false) {
    let message = `${getEmoji("inventory")} Инвентарь\n\n`;

    if (isSoloItem) {
        let itemName = inventory.bottleType ? `${inventory.bottleType}.${inventory.type}` : inventory.type;
        message += `${getEmoji(itemName)} ${translateMap[itemName]}: ${inventory.description}.`;
    } else if (Array.isArray(inventory)) {
        for (let item of inventory) {
            console.log(item.type)
            if (item.hasOwnProperty("bottleType")) {
                message += `${getEmoji(`${item.bottleType}.${item.type}`)} ${item.name}: ${item.description}.\nКоличество: ${item.count}\n\n`;
            } else {
                message += `${getEmoji(item.type)} ${translateMap[item.type]}: ${item.description}\n`;
            }
        }
    } else {
        for (let [key, item] of Object.entries(inventory)) {
            if (key === "potions") {
                message += getPotionsMessage(inventory[key]);
            } else {
                message += `${getEmoji(key)} ${translateMap[key]}: ${item}\n`;
            }
        }
    }

    return message;
}

function getPotionsMessage(potions) {
    let message = `\n${getEmoji("potions")} ${translateMap["potions"]}:\n`;
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