const buildsTemplate = require("../../../templates/buildsTemplate");
const getTime = require('../../getters/getTime');
const calculateUpgradeCosts = require('../../../functions/game/builds/calculateUpgradeCosts');
const calculateOptimalSpeedUpCost = require('../../../functions/game/builds/calculateOptimalSpeedUpCost');
const calculateBuildTime = require('../../../functions/game/builds/calculateBuildTime');

module.exports = function (name, action, build) {
    let buildTemplate = buildsTemplate[name];
    let [remain] = getTime(build.lastCollectAt);

    switch (action) {
        case "home":
            return `${buildTemplate.name} - ${buildTemplate.description}`;
        case "upgrade":
            return `${buildTemplate.name} - улучшение здания.\n\nУровень: ${build.currentLvl}\nСтоимость улучшения на следующий уровень: ${getUpgradeCostText(build, buildTemplate)}`;
        case "upgrade.upgradeLvl":
            return `${buildTemplate.name} - улучшение здания.\n\nУровень: ${build.currentLvl}\nВы уверены, что хотите улучшить здание?\n\nСтоимость улучшения на следующий уровень: ${getUpgradeCostText(build, buildTemplate)}`;
        case "upgrade.upgradeLvl.0":
            return `${buildTemplate.name} - улучшение здания.\n\nУровень: ${build.currentLvl}\nВы успешно улучшили здание до: ${build.currentLvl} ур.!`;
        case "upgrade.speedup":
            return `${buildTemplate.name} - улучшение здания.\n\nУровень: ${build.currentLvl}\nЗдание уже улучшается. Вы можете ускорить постройку.`;
        case "upgrade.speedup.0":
            return `${buildTemplate.name} - улучшение здания.\n\nУровень: ${build.currentLvl}\nВы уверены, что хотите ускорить постройку?\n\nСтоимость ускорения: ${getSpeedUpCost(buildTemplate.upgradeTime)}\n\nОставшееся время для улучшения: ${calculateBuildTime(name, build.currentLvl, build)}`;
        case "status":
            return `${buildTemplate.name} - статус здания.\n\nУровень: ${build.currentLvl}\nСтатус: ${getBuildStatus(name, build)}`;
        case "collect.0":
            return `${buildTemplate.name} - собрать прибыль.\n\nПроизведено: ${build.resourceCollected}.\nОсталось времени непрерывного производства: ${remain}`;
        case "collect.1":
            return `${buildTemplate.name} - невозможно собрать прибыль.\n\nЕщё ничего не произведено.\nОсталось времени непрерывного производства: ${remain}`;
        case "changeType":
            return `${buildTemplate.name} - Изменить внешний вид\n\nПо умолчанию, Вам доступен только стандартный вид, для получения других внешних видов, необходимо зайти в магазин через команду /shop.`;
        case "changeName":
            return `${buildTemplate.name} - Изменить название дворца`;
        case "guarded":
            return `${buildTemplate.name} - статус казны.\n\nНа данный момент под защитой: золота, руды, кристаллов.`;
        default:
            return `${buildTemplate.name} - ${buildTemplate.description}`;
    }
}

function getBuildStatus(name, build) {
    let types = buildsTemplate[name]?.availableTypes;

    if (name === "goldMine" || name === "ironDeposit" || name === "crystalLake") {
        return `Текущие накопления: ${build.resourceCollected}`;
    } else if (name === "palace") {
        return `Тип дворца: ${types[build.type].name}\nНазвание дворца: ${build.customName || "Дворец"}`;
    }
}

function getUpgradeCost(build, buildTemplate) {
    let nextLvl = build.currentLvl + 1;
    return calculateUpgradeCosts(buildTemplate.upgradeCosts, nextLvl);
}

function getUpgradeCostText(build, buildTemplate) {
    const map = { gold: "золота", crystal: "кристаллов", ironOre: "железной руды" };
    let str = ``;

    for (let [upgradeKey, upgradeValue] of Object.entries(getUpgradeCost(build, buildTemplate))) {
        for (let [key, value] of Object.entries(map)) {
            if (upgradeKey === key) {
                str += `\n${upgradeValue} ${value}`;
            }
        }
    }

    return str;
}

function getSpeedUpCost(buildUpgradeTime) {
    return calculateOptimalSpeedUpCost(buildUpgradeTime);
}