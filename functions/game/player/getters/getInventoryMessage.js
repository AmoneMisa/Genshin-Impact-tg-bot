import getEmoji from '../../../getters/getEmoji.js';
import inventoryDictionary from '../../../../dictionaries/inventory.js';
import lodash from 'lodash';

export default function (inventory, isSoloItem = false, categoryName = "") {
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

        return message
    }

    if (lodash.isArray(inventory)) {
        if (categoryName === "potions") {
            message += getPotionsMessage(inventory, categoryName);
        } else if (categoryName === "gacha") {
            message += getGachaMessage(inventory, categoryName);
        } else if (categoryName === "equipment") {
            message += getEquipMessage(inventory, categoryName);
        } else if (categoryName) {
            message += getCommonMessage(inventory, categoryName);
        }

        return message;
    }

    for (let [key, item] of Object.entries(inventory)) {
        if (key === "gold" || key === "crystals" || key === "ironOre") {
            continue;
        }

        if (key) {
            message += getCommonMessage(item, key);
        }
    }

    return message;
}

function getPotionsMessage(potions) {
    if (!potions?.length) {
        return "";
    }

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
    if (!equipment?.length) {
        return "";
    }

    let message = `\n${inventoryDictionary["equipment"]}:\n`;
    let newEquipment = equipment;
    if (equipment.length >= 4) {
        newEquipment = equipment.slice(0, 4);
    }

    let equipmentByMainType = {};

    for (let equip of newEquipment) {
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
    if (!gacha.length) {
        return "";
    }

    let message = `\n${inventoryDictionary["gacha"]}:\n`;

    for (let gachaItem of gacha) {
        message += `${inventoryDictionary[gachaItem.name]}: осколки для призыва. Количество: ${gachaItem.value}\n`;
    }

    return message;
}

function getCommonMessage(category, categoryName) {
    if (!category?.length) {
        return "";
    }

    let message = `\n${getEmoji(categoryName)} ${inventoryDictionary[categoryName]}:\n`;

    for (let categoryItem of category) {
        for (const [key, value] of Object.entries(categoryItem)) {
            message += `${key}. Количество: ${value}\n`;
        }
    }

    return message;
}