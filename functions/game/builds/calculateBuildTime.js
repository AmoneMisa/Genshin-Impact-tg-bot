const calculateIncreaseUpgradeTime = require('./calculateIncreaseUpgradeTime');
const buildsTemplate = require("../../../templates/buildsTemplate");

// Калькулятор оставшегося времени постройки
const maxLvl = 30;

module.exports = function (buildName, lvl, build, speedUp) {
    if (lvl < 1 || lvl > maxLvl) {
        return 'Указан некорректный уровень!';
    }

    let buildTemplate = buildsTemplate[buildName];
    let buildTime;

    if (build.upgradeStartedAt < 0) {
        build.upgradeStartedAt = 0;
        return 0;
    }

    if (speedUp) {
        buildTime = build.upgradeStartedAt - speedUp;


        if (buildTime <= 0) {
            build.upgradeStartedAt = 0;
           return 0;
        }
    }

    if (build.upgradeStartedAt) {
        return build.upgradeStartedAt;
    }

    if (!buildTemplate.upgradeTime || !buildTemplate.upgradeTime[lvl]) {
        buildTime = calculateIncreaseUpgradeTime(buildName, lvl);
    }

    if (buildTemplate.upgradeTime[lvl]) {
        return buildTemplate.upgradeTime[lvl];
    }

    return buildTime;
};