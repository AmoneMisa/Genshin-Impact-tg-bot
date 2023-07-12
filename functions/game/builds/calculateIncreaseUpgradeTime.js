const buildsTemplate = require("../../../templates/buildsTemplate");

module.exports = function (buildName, lvl) {
        const buildTemplate = buildsTemplate[buildName];

        if (!buildTemplate) {
            return;
        }

    const modifier = 1.15; // Модификатор для увеличения времени постройки

    const baseTime = buildTemplate.upgradeTime[0];
    const baseModifier = 1 + (lvl - 2) * modifier;

    return Math.round(baseTime * baseModifier);
}