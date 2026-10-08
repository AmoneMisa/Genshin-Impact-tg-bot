import bossLootTemplate from '../../../../template/bossLootTemplate.js';
import lodash from 'lodash';

import bossTemplates from '../../../../template/bossTemplate.js';

const DEFAULT_MODIFIERS = {gold: 1.03, crystals: 1.05, experience: 1.3};

function modifiersFor(bossName) {
    return {...DEFAULT_MODIFIERS, ...(bossTemplates.find(item => item.name === bossName)?.lootMod || {})};
}

export default function (boss) {
    const modifiers = {[boss.name]: modifiersFor(boss.name)};
    let newLootObj = {};
    for (let [lootType, lootArray] of Object.entries(bossLootTemplate)) {
        // Equipment rolls are shares of the fighters (not amounts), so they are not scaled by boss level.
        if (lootType === "equipment") {
            newLootObj[lootType] = lootArray.map(item => ({...item}));
            continue;
        }

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