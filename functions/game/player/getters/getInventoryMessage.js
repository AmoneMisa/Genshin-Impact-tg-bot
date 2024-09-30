import getEmoji from '../../../getters/getEmoji.js';
import inventoryDictionary from '../../../../dictionaries/inventory.js';

export default function (inventory, isSoloItem = false) {
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
                message += getEquipMessage(inventory[key])
            } else if (key) {
                message += getCommonMessage(key);
            }
        }
    }

    return message;
}

function getPotionsMessage(potions) {
    if (!potions?.items?.length) {
        return "";
    }

    let filteredPotions = potions.items.filter(potion => potion.count > 0);
    if (filteredPotions.length <= 0) {
        return "";
    }

    let message = `\n${getEmoji("potions")} ${potions.name}:\n`;
    for (let potion of filteredPotions) {
        let findStr = `${potion.bottleType}.${potion.type}`;
        message += `${getEmoji(findStr)} ${potion.name}: ${potion.description}. Количество: ${potion.count}\n`;
    }

    return message;
}

function getEquipMessage(equipment) {
    if (!equipment?.items?.length) {
        return "";
    }

    let message = `\n${equipment.name}:\n`;
    let newEquipment = equipment.items;
    if (equipment.items.length >= 4) {
        newEquipment = equipment.items.slice(0, 4);
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
    if (!gacha?.items?.length) {
        return "";
    }

    let message = `\n${gacha.name}:\n`;

    for (let gachaItem of gacha.items) {
        message += `${inventoryDictionary[gachaItem.name]}: осколки для призыва. Количество: ${gachaItem.value}\n`;
    }

    return message;
}

function getCommonMessage(category) {
    if (!category?.items?.length) {
        return "";
    }

    let message = `\n${getEmoji(category.name)} ${category.name}:\n`;

    for (let categoryItem of category.items) {
        for (const [key, value] of Object.entries(categoryItem)) {
            message += `${key}. Количество: ${value}\n`;
        }
    }

    return message;
}