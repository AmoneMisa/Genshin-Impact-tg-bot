const getEmoji = require('../../getters/getEmoji');
const inventoryDictionary = require('../../../dictionaries/inventory.js');

module.exports = function (inventory, isSoloItem = false) {
    let message = `${getEmoji("inventory")} Инвентарь\n\n`;

    if (isSoloItem) {
        let itemName = inventory.bottleType ? `${inventory.bottleType}.${inventory.type}` : inventory.type;
        message += `${getEmoji(itemName)} ${inventory.name}: ${inventory.description}.`;

    } else if (Array.isArray(inventory)) {
        let filteredInventory = inventory.filter(item => item.count > 0);
        if (filteredInventory.length <= 0) {
            return "";
        }

        for (let item of inventory) {
            if (item.hasOwnProperty("bottleType")) {
                message += `${getEmoji(`${item.bottleType}.${item.type}`)} ${item.name}: ${item.description}.\nКоличество: ${item.count}\n\n`;
            } else {
                message += `${getEmoji(item.type)} ${inventoryDictionary[item.type]}: ${item.description}\n`;
            }
        }
    } else {
        for (let [key, item] of Object.entries(inventory)) {
            if (key === "potions") {
                message += getPotionsMessage(inventory[key]);
            } else {
                message += `${getEmoji(key)} ${inventoryDictionary[key]}: ${item}\n`;
            }
        }
    }

    return message;
}

function getPotionsMessage(potions) {
    let filteredPotions = potions.filter(potion => potion.count > 0);
    if (filteredPotions.length <= 0) {
        return "";
    }

    let message = `\n${getEmoji("potions")} ${inventoryDictionary["potions"]}:\n`;
    for (let potion of filteredPotions) {

        let findStr = `${potion.bottleType}.${potion.type}`;
        message += `${getEmoji(findStr)} ${potion.name}: ${potion.description}. Количество: ${potion.count}\n`;
    }

    return message;
}
