const inventoryTranslate = require("../../../dictionaries/inventory");
const statsDictionary = require("../../../dictionaries/statsDictionary");
const getEmoji = require("../../getters/getEmoji");

let percentageStats = ["criticalDamage", "reduceIncomingDamage", "additionalDamage", "maxHp", "maxCp", "maxMp"];

module.exports = function (session) {
    let equipmentStats = session.game.equipmentStats;
    let message = "";

    for (let [statName, stat] of Object.entries(equipmentStats)) {
        if (stat === null) {
            return;
        }

        message += `\n${getEmoji(statName)} ${inventoryTranslate[statName]}: ${stat.name}\n`;
        message += `${getEmoji("separator")} Характеристики:\n`;

        let penaltyStats = [];
        for (let addStats of stat.characteristics) {
            if (addStats.type === "main") {
                continue;
            }

            if (addStats.type === "penalty") {
                penaltyStats.push(addStats);
                continue;
            }

            let value = percentageStats.includes(addStats.name) ? `${(addStats.value * 100).toFixed(2)}%` : addStats.value;
            message += `${getEmoji(addStats.name)} ${statsDictionary[addStats.name]}: ${value}\n`;
        }

        if (penaltyStats.length) {
            message += `${getEmoji("separator")} Негативные эффекты:\n`;
        }
        for (let addStats of penaltyStats) {
            let value = percentageStats.includes(addStats.name) ? `${(addStats.value * 100).toFixed(2)}%` : addStats.value;
            message += `${getEmoji(addStats.name)} ${statsDictionary[addStats.name]}: ${value}\n`;
        }
    }

    return message;
}