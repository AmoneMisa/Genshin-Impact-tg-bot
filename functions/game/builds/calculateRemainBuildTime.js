const calculateIncreaseUpgradeTime = require('./calculateUpgradeTime');
const buildsTemplate = require("../../../templates/buildsTemplate");
// Калькулятор оставшегося времени постройки
const maxLvl = 30;

/**
 * Вычисляет время оставшееся до улучшения здания
 * @param buildName
 * @param build
 * @returns Время оставшееся до улучшения здания в миллисекундах
 */
module.exports = function (buildName, build) {
    if (build.currentLvl < 1 || build.currentLvl > maxLvl) {
        throw new Error("Указан некорректный уровень!");
    }
    if (!build.upgradeStartedAt) {
        throw new Error("Нет времени начала улучшения");
    }

    let buildTemplate = buildsTemplate[buildName];
    let buildTime;

    if (buildTemplate.upgradeTime[build.currentLvl - 2]) {
        buildTime = buildTemplate.upgradeTime[build.currentLvl - 2].time;
    } else {
        buildTime = calculateIncreaseUpgradeTime(buildName, build.currentLvl);
    }

    let upgradeEndedAt = build.upgradeStartedAt + buildTime * 60 * 60 * 1000;
    return Math.max(0, upgradeEndedAt - new Date().getTime());
};