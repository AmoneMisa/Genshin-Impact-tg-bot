const buildsTemplate = require("../../../template/buildsTemplate");
const calculateUpgradeCosts = require("./calculateUpgradeCosts");
module.exports = function (currentLvl, buildName, inventory) {
    let buildTemplate = buildsTemplate[buildName];
    let nextLvl = currentLvl + 1;
    let currentUpgrade = calculateUpgradeCosts(buildTemplate.upgradeCosts, nextLvl);

    inventory.crystals -= currentUpgrade.crystals;
    inventory.gold -= currentUpgrade.gold;
    inventory.ironOre -= currentUpgrade.ironOre;
}