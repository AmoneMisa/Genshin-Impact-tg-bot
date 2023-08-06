const inventoryTranslate = require("../../../../dictionaries/inventory");
const statsDictionary = require("../../../../dictionaries/statsDictionary");
const getEmoji = require("../../../getters/getEmoji");
const lodash = require("lodash");

let percentageStats = ["criticalDamage", "incomingDamageModifier", "additionalDamageMul", "maxHp", "maxCp", "maxMp"];

module.exports = function (session) {
    let equipmentStats = session.game.equipmentStats;
    let message = "";

    for (let [statName, stat] of Object.entries(equipmentStats)) {
        if (stat === null) {
            continue;
        }

        if (statName === "leftHand") {
            if (lodash.isEqual(equipmentStats["rightHand"], stat)) {
                continue;
            }
        }

        if (statName === "up") {
            if (lodash.isEqual(equipmentStats["down"], stat)) {
                continue;
            }
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

            if (addStats.name === "randomDamage") {
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