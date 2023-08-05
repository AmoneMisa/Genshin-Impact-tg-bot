const inventoryTranslate = require("../../../dictionaries/inventory");
const statsDictionary = require("../../../dictionaries/statsDictionary");
const getEmoji = require("../../getters/getEmoji");

module.exports = function (session) {
    let equipmentStats = session.game.equipmentStats;
    let message = "";

    console.log("equipmentStats", session.game.equipmentStats);

    for (let [statName, stat] of Object.entries(equipmentStats)) {
        if (stat === null) {
            return;
        }

        message += `\n${getEmoji(statName)} ${inventoryTranslate[statName]}: ${stat.name}\n`;
        message += `Характеристики:\n`;
        let characteristicName = "";

        if (equipmentStats.mainType === "weapon") {
            characteristicName = "attack";
        } else if (equipmentStats.mainType === "armor") {
            characteristicName =  "defence";
        } else if (equipmentStats.mainType === "shield") {
            characteristicName = "block";
        }

        message += `${getEmoji(characteristicName)} ${statsDictionary[characteristicName]} ${stat.main}\n`;

        for (let addStats of stat.additional) {
            message += `${getEmoji(addStats.characteristicName)} ${statsDictionary[addStats.characteristicName]}: ${addStats.characteristicValue}\n`;
        }

        for (let penalty of stat.penalty) {
            message += `${getEmoji(penalty.characteristicName)} ${statsDictionary[penalty.characteristicName]}: ${penalty.characteristicValue}\n`;
        }
    }

    return message;
}