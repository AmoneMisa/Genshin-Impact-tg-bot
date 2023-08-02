const getEmoji = require('../../getters/getEmoji');
const inventoryDictionary = require('../../../dictionaries/inventory');

module.exports = function (inventory, isSoloItem = false) {
    let message = `${getEmoji("inventory")} Инвентарь\n\n`;

    if (inventory.hasOwnProperty("gold") && inventory.hasOwnProperty("crystals") && inventory.hasOwnProperty("ironOre")) {
        message += `${getEmoji("gold")} золото: ${inventory.gold}\n`;
        message += `${getEmoji("crystals")} кристаллы: ${inventory.crystals}\n`;
        message += `${getEmoji("ironOre")} железная руда: ${inventory.ironOre}\n`;
    }


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
            if (key === "gold" || key === "crystals" || key === "ironOre") {
                continue;
            }

            if (key === "potions") {
                message += getPotionsMessage(inventory[key]);
            } else if (key === "gacha") {
                message += getGachaMessage(inventory[key]);
            } else if (key === "equipment") {
                message += getEquipMessage(inventory[key]);
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

function getEquipMessage(equipment) {
    let message = `\n${inventoryDictionary["equipment"]}:\n`;

    for (let [equipName, type] of Object.entries(equipment)) {
        let filteredTypes = Array.from(Object.values(type)).filter(kindArray => kindArray.length);

        if (!filteredTypes.length) {
            continue;
        }

        if (filteredTypes.length >= 5) {
            filteredTypes.slice(0, 4);
        }

        message += `${getEmoji(equipName)} ${inventoryDictionary[equipName]}:\n`;

        for (let [equipItem] of filteredTypes) {
            message += `${getEmoji("separator")} ${equipItem.name} \n`
        }
    }

    return message;
}

function getGachaMessage(gacha) {
    let message = `\n${inventoryDictionary["gacha"]}:\n`;
    for (let [key, value] of Object.entries(gacha)) {
        if (value === 0) {
            continue;
        }

        message += `${inventoryDictionary[key]}: осколки для призыва. Количество: ${value}\n`;
    }

    return message;
}