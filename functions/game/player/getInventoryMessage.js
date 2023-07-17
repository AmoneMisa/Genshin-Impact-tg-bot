module.exports = function (inventory) {
    let message = "";

    for (let [key, item] of Object.entries(inventory)) {
        if (key === "potions") {
            message += getPotionsMessage(inventory[key]);
        } else {
            message += `${translateMap[key]}: ${item}\n`;
        }

    }

    return message;
}

function getPotionsMessage(potions) {
    let message = "";
    for (let [key, potion] of Object.entries(potions)) {
        console.log(potions, key, potion)
        message += `${translateMap[key]}:\n`;

        for (let [potionKey, potionValue] of Object.entries(potion)) {
            message += `${translateMap["potion"]} ${translateMap[potionKey]} - ${translateMap["recovery"]} ${potionValue.power}. Количество: ${potionValue.count}\n`;
        }
    }

    return message;
}

const translateMap = {
    gold: "Золото",
    crystals: "Кристаллы",
    ironOre: "Железная руда",
    potions: "Зелья",
    potion: "Зелье",
    recovery: "восстанавливает",
    hp: "Хп",
    small: "Крохотное",
    smallMedium: "Маленькое",
};