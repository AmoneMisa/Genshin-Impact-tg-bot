const getEmoji = require('../../../getters/getEmoji');
const inventoryDictionary = require('../../../../dictionaries/inventory');

module.exports = function (inventory, isSoloItem = false) {
    let message = `${getEmoji("inventory")} Инвентарь\n\n`;

    if (inventory.hasOwnProperty("gold") && inventory.hasOwnProperty("crystals") && inventory.hasOwnProperty("ironOre")) {
        message += `${getEmoji("gold")} Золото: ${inventory.gold}\n`;
        message += `${getEmoji("crystals")} Кристаллы: ${inventory.crystals}\n`;
        message += `${getEmoji("ironOre")} Железная руда: ${inventory.ironOre}\n`;
    }

    if (isSoloItem) {
        let itemName;
        if (inventory.hasOwnProperty("bottleType")) {
            itemName = `${inventory.bottleType}.${inventory.type}`;
        } else if (inventory.hasOwnProperty("grade")) {
            itemName = inventory.mainType
        } else {
            itemName = inventory.type;
        }

        message += `${getEmoji(itemName)} ${inventory.name}: ${inventory.description}.`;
    } else if (Array.isArray(inventory)) {
        for (let item of inventory) {
            if (typeof item === "string" || typeof item === "number") {
                continue;
            }

            if (Array.isArray(item)) {
                for (let itemObj of item) {

                    if (typeof itemObj === "string" || typeof itemObj === "number") {
                        continue;
                    }

                    message += `${getEmoji(itemObj.category)} ${itemObj.name}\n`;
                }
            }

            if (item.hasOwnProperty("bottleType")) {
                message += `${getEmoji(`${item.bottleType}.${item.type}`)} ${item.name}: ${item.description}.\nКоличество: ${item.count}\n\n`;
            } else if (item.type) {
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

    if (equipment.length >= 10) {
        equipment.slice(0, 10);
    }

    let equipmentByMainType = {};

    for (let equip of equipment) {

        if (!equipmentByMainType[equip.mainType]) {
            equipmentByMainType[equip.mainType] = []
        }

        equipmentByMainType[equip.mainType].push(equip);
    }

    for (let [mainType, equipList] of Object.entries(equipmentByMainType)) {
        message += `${getEmoji(mainType)} ${inventoryDictionary[mainType]}:\n`;

        for (let equip of equipList) {
            if (equip.isUsed) {
                message += `${getEmoji(equip.category)} ${equip.name} (Используется)\n`;
            } else {
                message += `${getEmoji(equip.category)} ${equip.name}\n`;
            }
        }
    }

    return message;
}

function getGachaMessage(gacha) {
    let message = `\n${inventoryDictionary["gacha"]}:\n`;
    for (let gachaItem of gacha) {

        message += `${inventoryDictionary[gachaItem.name]}: осколки для призыва. Количество: ${gachaItem.value}\n`;
    }

    return message;
}