const statsDictionary = require("../../../dictionaries/statsDictionary");
const equipmentTemplate = require("../../../templates/equipmentTemplate");
const inventory = require("../../../dictionaries/inventory");
const getEmoji = require("../../../functions/getters/getEmoji");
const isStatPenalty = require("../../game/equipment/isStatPenalty");

function getStr(key, value) {
    let strValue;

    if (key.match(/Mul$/) || key === "incomingDamageModifier") {
        value = ((value - 1) * 100);
        strValue = value.toFixed(2) + '%';
    } else {
        strValue = '' + value;
    }

    if (value > 0) {
        strValue = '+' + strValue;
    }

    return `${getEmoji(key)} ${statsDictionary[key]}: ${strValue}\n`;
}

module.exports = function (item) {
    let str = `${item.name}\n\n`;

    str += `Класс: `;

    for (let classOwner of item.classOwner) {
        if (classOwner === "assassin") {
            continue;
        }

        str += `${statsDictionary[classOwner]} `;
    }

    str += "\n\n";

    str += `Минимальный уровень для использования: ${equipmentTemplate.grades.find(grade => grade.name === item.grade).lvl.from}\n\n`;

    str += `Характеристики:\n`;

    if (item.mainType === "shield") {
        for (let [characteristicKey, characteristicValue] of Object.entries(item.characteristics)) {
            str += getStr(characteristicKey, characteristicValue);
        }
    } else if (item.mainType === "armor") {
        for (let [characteristicKey, characteristicValue] of Object.entries(item.characteristics)) {
            str += getStr(characteristicKey, characteristicValue);
        }

        str += `Тип: ${getEmoji(item.kind)} ${item.translatedName}\n`;
        str += `Слот: `;

        for (let slot of item.slots) {
            str += `${inventory[slot]} `;
        }

        str += "\n";

    } else if (item.mainType === "weapon") {
        str += `${getEmoji("power")} ${statsDictionary["power"]} : ${item.characteristics.power}\n`;
        if (item.slots.length === 1) {
            str += `${getEmoji("oneHanded")} Одноручное\n`;
        } else {
            str += `${getEmoji("twoHanded")} Двуручное\n`;
        }
    }

    let filteredStats = item.stats.filter(_stat => !isStatPenalty(_stat.name, _stat.value));

    if (filteredStats.length) {
        str += `\n${getEmoji(item.rarity)} Дополнительные характеристики:\n`;
        for (let stat of filteredStats) {
            str += getStr(stat.name, stat.value);
        }
    }

    let penalty = item.stats.filter(_stat => isStatPenalty(_stat.name, _stat.value));

    if (penalty.length) {
        str += `\nОтрицательные характеристики:\n`;
        for (let stat of penalty) {
            str += getStr(stat.name, stat.value);
        }
    }

    str += `\n${getEmoji("quality")} Качество предмета: [${item.quality.current} / ${item.quality.max}]\n`;
    str += `${getEmoji("persistence")} Прочность предмета: [${item.persistence.current} / ${item.persistence.max}]\n`;

    return str;
};