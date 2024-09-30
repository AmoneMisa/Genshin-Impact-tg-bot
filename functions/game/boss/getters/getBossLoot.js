const bossLootTemplate = require('../../../../template/bossLootTemplate');
const lodash = require("lodash");

const modifiers = {
    kivaha: {gold: 1.03, crystals: 1.04, experience: 1.1},
    avrora: {gold: 1.035, crystals: 1.07, experience: 1.5},
    carnevorusIsse: {gold: 1.044, crystals: 1.06, experience: 2},
    fjorina: {gold: 1.021, crystals: 1.03, experience: 1.67},
    radjahal: {gold: 1.0155, crystals: 1.1, experience: 1.3}
}

module.exports = function (boss) {
    let newLootObj = {};
    for (let [lootType, lootArray] of Object.entries(bossLootTemplate)) {
        let newLootTypeArray = [];
        for (let loot of lootArray) {

            if (typeof loot === "number") {
                newLootTypeArray.push(Math.ceil(loot * modifiers[boss.name][lootType] * boss.stats.lvl));
                newLootObj[lootType] = newLootTypeArray;
                continue;
            }

            let newLoot = {};
            for (let [key, value] of Object.entries(loot)) {

                if (key === "chance") {
                    // Шансы на получение награды - строку НЕ менять!
                    newLoot[key] = value;
                    continue;
                }

                if (lodash.isObject(value)) {
                    newLoot[key] = {
                        minAmount: Math.ceil(value.minAmount * modifiers[boss.name][lootType] * boss.stats.lvl),
                        maxAmount: Math.ceil(value.maxAmount * modifiers[boss.name][lootType] * boss.stats.lvl)
                    };
                } else {
                    newLoot[key] = Math.ceil(value * modifiers[boss.name][lootType] * boss.stats.lvl);
                }
            }
            newLootTypeArray.push(newLoot);
            newLootObj[lootType] = newLootTypeArray;
        }
    }

    return newLootObj;
}