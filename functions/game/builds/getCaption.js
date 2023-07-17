const buildsTemplate = require("../../../templates/buildsTemplate");
const getTime = require('../../getters/getTime');
const getStringRemainTime = require('../../getters/getStringRemainTime');
const calculateUpgradeCosts = require('../../../functions/game/builds/calculateUpgradeCosts');
const calculateOptimalSpeedUpCost = require('../../../functions/game/builds/calculateOptimalSpeedUpCost');
const calculateRemainBuildTime = require('./calculateRemainBuildTime');
const calculateIncreaseInResourceExtraction = require("./calculateIncreaseInResourceExtraction");

module.exports = function (buildName, action, build) {
    let buildTemplate = buildsTemplate[buildName];
    let [remain] = getTime(build.lastCollectAt + (buildTemplate.maxWorkHoursWithoutCollection * 60 * 60 * 1000));

    switch (action) {
        case "home":
            return `${build.customName || buildTemplate.name} - ${buildTemplate.description}`;
        case "upgrade":
            return `${buildTemplate.name} - улучшение здания.\n\nУровень: ${build.currentLvl}\nСтоимость улучшения на следующий уровень: ${getUpgradeCostText(build, buildTemplate)}`;
        case "upgrade.upgradeLvl":
            return `${buildTemplate.name} - улучшение здания.\n\nУровень: ${build.currentLvl}\nВы уверены, что хотите улучшить здание?\n\nСтоимость улучшения на следующий уровень: ${getUpgradeCostText(build, buildTemplate)}`;
        case "upgrade.upgradeLvl.0":
            return `${buildTemplate.name} - улучшение здания.\n\nУровень: ${build.currentLvl}\nВы начали улучшение здания до: ${build.currentLvl} ур.!`;
        case "upgrade.speedup":
            return `${buildTemplate.name} - улучшение здания.\n\nУровень: ${build.currentLvl}\nЗдание уже улучшается. Вы можете ускорить постройку.`;
        case "upgrade.speedup.0":
            return `${buildTemplate.name} - улучшение здания.\n\nУровень: ${build.currentLvl}\nВы уверены, что хотите ускорить постройку?\n\nСтоимость ускорения: ${calculateOptimalSpeedUpCost(buildName, build)} кристаллов.\n\nОставшееся время для улучшения: ${getStringRemainTime(calculateRemainBuildTime(buildName, build))}`;
        case "upgrade.speedup.1":
            return `${buildTemplate.name} - улучшение здания.\n\nВы успешно завершили улучшение здания ${buildTemplate.name} до ${build.currentLvl} ур!`;
        case "status":
            return `${buildTemplate.name} - статус здания.\n\nУровень: ${build.currentLvl}\nСтатус:\n${getBuildStatus(buildName, build)}`;
        case "collect.0":
            return `${buildTemplate.name} - собрать прибыль.\n\nПроизведено: ${build.resourceCollected}.\nОсталось времени непрерывного производства: ${getStringRemainTime(remain)}`;
        case "collect.1":
            return `${buildTemplate.name} - невозможно собрать прибыль.\n\nЕщё ничего не произведено.\nОсталось времени непрерывного производства: ${getStringRemainTime(remain)}`;
        case "changeType":
            return `${buildTemplate.name} - Изменить внешний вид\n\nПо умолчанию, Вам доступен только стандартный вид, для получения других внешних видов, необходимо зайти в магазин через команду /shop.`;
        case "changeName":
            return `${buildTemplate.name} - Изменить название дворца. Смена стоит 15000 золота. Чтобы приобрести право на смену названия - зайди в магазин: /shop`;
            case "changeName.0":
            return `${buildTemplate.name} - Изменить название дворца. Введи новое название.`;
        case "guarded":
            return `${buildTemplate.name} - статус казны.\n\nНа данный момент под защитой: золота, руды, кристаллов.`;
        default:
            return `${buildTemplate.name} - ${buildTemplate.description}`;
    }
}

function getBuildStatus(buildName, build) {
    let types = buildsTemplate[buildName]?.availableTypes;

    if (buildName === "goldMine" || buildName === "ironDeposit" || buildName === "crystalLake") {
        return `Текущие накопления: ${build.resourceCollected}\nПроизводство в час: ${buildsTemplate[buildName].productionPerHour * calculateIncreaseInResourceExtraction(buildName, build.currentLvl)}`;
    } else if (buildName === "palace") {
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