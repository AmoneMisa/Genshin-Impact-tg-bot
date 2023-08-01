const userStatsMap = require("../../../dictionaries/statsDictionary");
const getEmoji = require("../../../functions/getters/getEmoji");

const slotsMap = {
    helmet: "Голова/Шлем",
    gloves: "Перчатки/Наручи",
    down: "Низ",
    boots: "Ботинки/Сапоги",
    cloak: "Плащ/Накидка",
    up: "Верх"
}

module.exports = function (item) {
    let str = `${item.name}\n\n`;
    str += `Характеристики:\n`;

    if (item.type.mainType === "shield") {

        for (let [characteristicKey, characteristicValue] of Object.entries(item.type.kind.characteristics)) {
            str += `${getEmoji(characteristicKey)} ${userStatsMap[characteristicKey]}: ${characteristicValue}\n`;
        }

    } else if (item.type.mainType === "armor") {

        for (let [characteristicKey, characteristicValue] of Object.entries(item.type.kind.characteristics)) {
            str += `${getEmoji(characteristicKey)} ${userStatsMap[characteristicKey]}: ${characteristicValue}\n`;
        }

        str += `Тип: ${getEmoji(item.type.kind.name)} ${item.type.kind.translatedName}\n`;
        str += `Слот: `;

        for (let slot of item.type.type.slots) {
            str += `${slotsMap[slot]} `;
        }
        str += "\n";

    } else if (item.type.mainType === "weapon") {
        str += `${getEmoji("power")} Сила: ${item.type.kind.characteristics.power}\n`;
        if (item.type.kind.hand === 1) {
            str += `${getEmoji("oneHanded")} Одноручное\n`;
        } else if (item.type.kind.hand === 2) {
            str += `${getEmoji("twoHanded")} Двуручное\n`;
        }
    }

    if (item.stats.length) {
        str += `\nДополнительные характеристики:\n`;
        for (let stat of item.stats) {
            str += `${getEmoji(stat.name)} ${userStatsMap[stat.name]}: ${stat.value}\n`;
        }
    }

    if (item.type.kind.penalty) {
        for (let [statKey, statValue] of Object.entries(item.type.kind.penalty)) {
            str += `${getEmoji(statKey)} ${userStatsMap[statKey]}: ${statValue}\n`
        }
    }

    str += `\n${getEmoji("quality")} Качество предмета: [${item.quality.current} / ${item.quality.max}]\n`;
    str += `${getEmoji("persistence")} Прочность предмета: [${item.persistence.current} / ${item.persistence.max}]\n`;

    return str;
};