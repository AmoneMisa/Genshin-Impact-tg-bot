const userStatsMap = require("../../../dictionaries/statsDictionary");
const inventory = require("../../../dictionaries/inventory");
const getEmoji = require("../../../functions/getters/getEmoji");

module.exports = function (item) {
    let str = `${item.name}\n\n`;
    str += `Характеристики:\n`;

    if (item.mainType === "shield") {
        for (let [characteristicKey, characteristicValue] of Object.entries(item.characteristics)) {
            str += `${getEmoji(characteristicKey)} ${userStatsMap[characteristicKey]}: ${characteristicValue}\n`;
        }
    } else if (item.mainType === "armor") {
        for (let [characteristicKey, characteristicValue] of Object.entries(item.characteristics)) {
            str += `${getEmoji(characteristicKey)} ${userStatsMap[characteristicKey]}: ${characteristicValue}\n`;
        }

        str += `Тип: ${getEmoji(item.kind)} ${item.translatedName}\n`;
        str += `Слот: `;

        for (let slot of item.slots) {
            str += `${inventory[slot]} `;
        }

        str += "\n";

    } else if (item.mainType === "weapon") {
        str += `${getEmoji("power")} Сила: ${item.characteristics.power}\n`;
        if (item.slots.length === 1) {
            str += `${getEmoji("oneHanded")} Одноручное\n`;
        } else {
            str += `${getEmoji("twoHanded")} Двуручное\n`;
        }
    }

    if (item.stats.length) {
        str += `\n${getEmoji(item.rarity)} Дополнительные характеристики:\n`;
        for (let stat of item.stats) {
            str += `${getEmoji(stat.name)} ${userStatsMap[stat.name]}: ${stat.value}\n`;
        }
    }

    if (item.penalty) {
        for (let [statKey, statValue] of Object.entries(item.penalty)) {
            str += `${getEmoji(statKey)} ${userStatsMap[statKey]}: ${statValue}\n`
        }
    }

    str += `\n${getEmoji("quality")} Качество предмета: [${item.quality.current} / ${item.quality.max}]\n`;
    str += `${getEmoji("persistence")} Прочность предмета: [${item.persistence.current} / ${item.persistence.max}]\n`;

    return str;
};