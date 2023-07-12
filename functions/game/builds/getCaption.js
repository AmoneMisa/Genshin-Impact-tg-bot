const buildsTemplate = require("../../../templates/buildsTemplate");
const getTime = require('../../getters/getTime');

module.exports = function (name, action, build) {
    let buildTemplate = buildsTemplate[name];
    let maxWorkHoursWithoutCollection = getTime(build.lastCollectAt);

    switch (action) {
        case "home": return `${buildTemplate.name} - ${buildTemplate.description}`;
        case "upgrade": return `${buildTemplate.name} - улучшение здания.\n\nУровень: ${build.currentLvl}\nСтоимость улучшения на следующий уровень: `;
        case "status": return `${buildTemplate.name} - статус здания.\n\nУровень: ${build.currentLvl}\nСтатус: ${getBuildStatus(name, build)}` ;
        case "collect.0": return `${buildTemplate.name} - собрать прибыль.\n\nПроизведено: ${build.resourceCollected}.\nОсталось времени непрерывного производства: ${maxWorkHoursWithoutCollection[0]}`;
        case "collect.1": return `${buildTemplate.name} - невозможно собрать прибыль.\n\nЕщё ничего не произведено.\nОсталось времени непрерывного производства: ${maxWorkHoursWithoutCollection[0]}`;
        case "changeType": return `${buildTemplate.name} - Изменить внешний вид\n\nПо умолчанию, Вам доступен только стандартный вид, для получения других внешних видов, необходимо зайти в магазин через команду /shop.`;
        case "changeName": return `${buildTemplate.name} - Изменить название дворца`;
        case "guarded": return `${buildTemplate.name} - статус казны.\n\nНа данный момент под защитой: золота, руды, кристаллов.`;
        default: return `${buildTemplate.name} - ${buildTemplate.description}`;
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
