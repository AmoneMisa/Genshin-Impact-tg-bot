import buildsTemplate from '../../../template/buildsTemplate.js';
import calculateUpgradeCosts from './calculateUpgradeCosts.js';
export default function (currentLvl, buildName, inventory) {
    let buildTemplate = buildsTemplate[buildName];
    let nextLvl = currentLvl + 1;
    let currentUpgrade = calculateUpgradeCosts(buildTemplate.upgradeCosts, nextLvl);

    inventory.crystals -= currentUpgrade.crystals;
    inventory.gold -= currentUpgrade.gold;
    inventory.ironOre -= currentUpgrade.ironOre;
}