const buildsTemplate = require("../../../templates/buildsTemplate");

module.exports = function (buildName, lvl) {
    const buildTemplate = buildsTemplate[buildName];

    if (!buildTemplate) {
        throw new Error("Не найден шаблон здания");
    }

    const baseModifier = 1.15; // Модификатор для увеличения времени постройки

    const lastUpgrade = buildTemplate.upgradeTime[buildTemplate.upgradeTime.length - 1];
    let diffLvl = lvl - lastUpgrade.level;
    const modifier = Math.pow(baseModifier, diffLvl);

    return lastUpgrade.time * modifier;
}