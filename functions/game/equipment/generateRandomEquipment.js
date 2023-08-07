const equipmentTemplate = require("../../../templates/equipmentTemplate");
const equipmentBonusStatsTemplate = require("../../../templates/equipmentBonusStatsTemplate");
const getRandom = require("../../getters/getRandom");
const getRandomWithoutFloor = require("../../getters/getRandomWithoutFloor");
const getValueByChance = require("../../getters/getValueByChance");
const isStatPenalty = require("../../game/equipment/isStatPenalty");
const getNewChancesArrayByValue = require("../../getters/getNewChancesArrayByValue");
const equipmentDictionary = require("../../../dictionaries/equipment");
const lodash = require("lodash");

module.exports = function (currentLvl, grade) {
    let buildItem = getItemData(currentLvl, grade);
    let cost = getItemCost(buildItem);

    return {
        name: equipmentNameGenerator(buildItem, cost),
        description: equipmentDescriptionGenerator(),
        grade: buildItem.grade.name,
        classOwner: buildItem.kind.classOwner,
        quality: {current: buildItem.quality, max: buildItem.maxQuality},
        persistence: {current: buildItem.persistence, max: buildItem.maxPersistence},
        rarity: buildItem.rarity.name,
        rarityTranslated: buildItem.rarity.translatedName,
        mainType: buildItem.mainType,
        category: buildItem.kind.category,
        kind: buildItem.kind.type,
        characteristics: buildItem.kind.characteristics,
        translatedName: buildItem.kind.translatedName,
        slots: buildItem.kind.slots,
        stats: [...buildItem.stats, ...buildItem.penalty],
        cost: cost
    }
}

function equipmentNameGenerator(item, cost) {
    let what = item.kind.translatedName;
    let which = equipmentDictionary.whichList[Math.floor(Math.random() * (equipmentDictionary.whichList.length - 1))];
    let whose = equipmentDictionary.whoseList[Math.floor(Math.random() * (equipmentDictionary.whoseList.length - 1))];
    return `(${item.grade.name} - Grade, ${item.rarity.translatedName}) ${what} ${which} ${whose} - ${cost} золота`;
}

function equipmentDescriptionGenerator() {
    let where = equipmentDictionary.descriptionWhere[Math.floor(Math.random() * (equipmentDictionary.descriptionWhere.length - 1))];
    let whose = equipmentDictionary.descriptionWhose[Math.floor(Math.random() * (equipmentDictionary.descriptionWhose.length - 1))];
    let why = equipmentDictionary.descriptionWhy[Math.floor(Math.random() * (equipmentDictionary.descriptionWhy.length - 1))];
    return `${where} ${whose} ${why}`;
}

function getItemData(currentLvl, calledGrade) {
    const grade = getItemGrade(currentLvl, calledGrade);
    const {mainType, kind} = getItemType();
    const {quality, maxQuality} = getItemQuality(grade);
    const {persistence, maxPersistence} = getItemPersistence(grade);
    let characteristicsKeys = Object.keys(kind.characteristics);
    const stats = getItemAdditionalStats(grade, characteristicsKeys);
    characteristicsKeys = [...characteristicsKeys, ...stats.map(stat => stat.name)];
    const penalty = getItemAdditionalPenaltyStats(grade, characteristicsKeys);
    const rarity = getItemRarity(Object.entries(stats).filter(([name, value]) => !isStatPenalty(name, value)).length);

    return {
        grade,
        quality,
        maxQuality,
        persistence,
        maxPersistence,
        rarity,
        mainType,
        kind,
        stats,
        penalty
    };
}

// Функция для получения уровня предмета
function getItemGrade(currentLvl, calledGrade) {
    let chanceForUpgradedGrade = 0.05;
    let chance = Math.random();
    let currentGrade;

    if (calledGrade) {
        currentGrade = equipmentTemplate.grades.find(grade => grade.name.toLowerCase() === calledGrade.toLowerCase());
    } else {
        currentGrade = equipmentTemplate.grades.find(grade => grade.lvl.from <= currentLvl && currentLvl <= grade.lvl.to);
    }

    let currentGradeIndex = equipmentTemplate.grades.indexOf(currentGrade);

    if (chanceForUpgradedGrade >= chance) {
        currentGradeIndex++;
        currentGrade = equipmentTemplate.grades[currentGradeIndex];
    }

    return currentGrade;
}

// Функция для получения редкости предмета
function getItemRarity(countCharacteristics) {
    return equipmentTemplate.rarity.find(rarity => rarity.count === countCharacteristics);
}

// Функция для получения качества предмета
function getItemQuality(itemGrade) {
    let itemTemplateGrade = equipmentTemplate.grades.find(grade => grade.name === itemGrade.name);

    return {
        quality: getRandom(itemTemplateGrade.quality.min, itemTemplateGrade.quality.max),
        maxQuality: itemTemplateGrade.quality.max
    };
}

// Функция для получения прочности предмета
function getItemPersistence(itemGrade) {
    let itemTemplateGrade = equipmentTemplate.grades.find(grade => grade.name === itemGrade.name);

    return {
        persistence: getRandom(itemTemplateGrade.persistence.min, itemTemplateGrade.persistence.max),
        maxPersistence: itemTemplateGrade.persistence.max
    };
}

// Функция для получения типа предмета
function getItemType() {
    let mainType = equipmentTemplate.itemType[getRandom(0, equipmentTemplate.itemType.length - 1)];
    let kind = mainType.kind[getRandom(0, mainType.kind.length - 1)];
    return {mainType: mainType.name, kind};
}

// Функции для получения характеристик предмета
function getItemAdditionalStats(itemGrade, characteristicsKeys) {
    let itemTemplateGrade = equipmentTemplate.grades.find(grade => grade.name === itemGrade.name);
    let min = itemTemplateGrade.characteristics.min;
    let max = itemTemplateGrade.characteristics.max;
    let diff = max - min;
    let chances;

    if (diff > 1) {
        let middle = Math.round((min + max) / 2);
        chances = [{
            chance: 0.63, value: min
        }, {
            chance: 0.3, value: middle
        }, {
            chance: 0.07, value: max
        }];
    } else {
        chances = [{
            chance: 0.93, value: min
        }, {
            chance: 0.07, value: max
        }];
    }

    let chance = Math.random();

    return getRandomItemStats(getValueByChance(chance, chances), itemGrade, characteristicsKeys);
}

// Функции для получения штрафа предмета
function getItemAdditionalPenaltyStats(itemGrade, characteristicsKeys) {
    let itemTemplateGrade = equipmentTemplate.grades.find(grade => grade.name === itemGrade.name);

    if (!itemTemplateGrade) {
        throw new Error(`Не найден такой грейд: ${JSON.stringify(itemGrade)}`);
    }

    let min = itemTemplateGrade.penalty.min;
    let max = itemTemplateGrade.penalty.max;
    let diff = max - min;
    let chances;

    if (diff > 1) {
        let middle = Math.round((min + max) / 2);
        chances = [{
            chance: 0.63, value: min
        }, {
            chance: 0.3, value: middle
        }, {
            chance: 0.07, value: max
        }];
    } else {
        chances = [{
            chance: 0.93, value: min
        }, {
            chance: 0.07, value: max
        }];
    }

    let chance = Math.random();

    return getRandomItemStats(getValueByChance(chance, chances), itemGrade, characteristicsKeys);
}

function getRandomItemStats(count, grade, characteristicsKeys) {
    const possibleStats = [
        "skillCooltimeMul",
        "attack",
        "attackMul",
        "defence",
        "defenceMul",
        "criticalChance",
        "criticalDamage",
        "incomingDamageModifier",
        "additionalDamageMul",
        "maxHpMul",
        "maxHp",
        "maxCpMul",
        "maxCp",
        "maxMpMul",
        "maxMp",
        "hpRestoreSpeed",
        "mpRestoreSpeed",
        "cpRestoreSpeed",
        "speed",
        "block",
        "accuracy",
        "evasion",
        "healPowerMul",
        "healPowerPotionsMul",
    ];

    let newCharacteristics = [];
    let newCharacteristicsKeys = [];

    while (newCharacteristics.length < count) {
        let randomStat = possibleStats[getRandom(0, possibleStats.length - 1)];

        if (characteristicsKeys.includes(randomStat)) {
            continue;
        }

        if (newCharacteristicsKeys.includes(randomStat)) {
            continue;
        }

        let stat = {name: randomStat, value: setItemStatsValue(randomStat, grade)}
        newCharacteristics.push(stat);
        newCharacteristicsKeys.push(randomStat);
    }

    return newCharacteristics;
}

function setItemStatsValue(stat, itemGrade) {
    let chance = Math.random();
    let chances;

    if (itemGrade === "noGrade" || itemGrade === "D" || itemGrade === "C") {
        chances = getNewChancesArrayByValue(equipmentBonusStatsTemplate[stat], 2);
    } else if (itemGrade === "B" || itemGrade === "A") {
        chances = getNewChancesArrayByValue(equipmentBonusStatsTemplate[stat], 3);
    } else {
        chances = equipmentBonusStatsTemplate[stat];
    }

    let randomItem = getValueByChance(chance, chances);
    return getRandomWithoutFloor(randomItem.min, randomItem.max);
}

// Функция для получения стоимости предмета
function getItemCost(item) {
    let grade = equipmentTemplate.grades.find(grade => grade.name === item.grade.name);

    if (lodash.isUndefined(grade)) {
        throw new Error(`Не найден грейд для предмета: ${JSON.stringify(item)}`);
    }

    let gradeIndex = equipmentTemplate.grades.indexOf(grade);
    let prevGrade;

    if (gradeIndex > 0) {
        prevGrade = equipmentTemplate.grades[gradeIndex - 1];
    } else {
        prevGrade = grade;
    }

    let gradePrice = getRandom(prevGrade.cost, grade.cost);
    let rarity = equipmentTemplate.rarity.find(rarity => rarity.name === item.rarity.name);

    if (lodash.isUndefined(rarity)) {
        throw new Error(`Не найдена редкость для предмета: ${JSON.stringify(item)}`);
    }

    let rarityIndex = equipmentTemplate.rarity.indexOf(rarity);
    let rarityPrev;

    if (gradeIndex > 0) {
        rarityPrev = equipmentTemplate.rarity[rarityIndex - 1];
    } else {
        rarityPrev = rarity;
    }

    let rarityPrice = getRandom(rarityPrev.cost, rarity.cost);

    let penalty = Object.entries(item.kind.characteristics).filter(([statName, statValue]) => isStatPenalty(statName, statValue));
    let penaltyPrice = penalty.length * -5000;

    if (lodash.isUndefined(item.quality)) {
        throw new Error(`Не найдено качество для предмета: ${JSON.stringify(item)}`);
    }

    if (lodash.isUndefined(item.persistence)) {
        throw new Error(`Не найдена прочность для предмета: ${JSON.stringify(item)}`);
    }

    let setPrice = item.isSet ? 65000 : 0;
    let qualityPrice = 300 + (item.quality / 100) * (100000 - 300);
    let persistencePrice = 90 + (item.persistence / 100) * (8900 - 90);

    return Math.floor(gradePrice + rarityPrice + setPrice + qualityPrice + persistencePrice + penaltyPrice);

//Стоимость в золоте:
// Базовая стоимость класса снаряжения
// (noGrade - 100 золота, D - 1200, C - 3400, B - 7000, A - 55000, S - 136000, SS - 223000, SSS 1890000) +
// Базовая стоимость редкости снаряжения (серый - 50, белый - 160, зелёный - 600, синий - 5000, фиолетовый - 8900,
// золотой - 25000, красный - 197000, радужный - 435000, голубой - 6500000) +
// если снаряжение принадлежит к сэту снаряжения (набор снаряжения будет указан в отдельном списке.), то 65000 +
// качество снаряжения (от 300 до 100000 в зависимости от количества единиц качества) +
// прочность снаряжения (от 90 до 8900 в зависимости от максимальных единиц прочности).
// За каждый негативный стат - минус 5000
// Стоимость считается рандомно от предыдущего качества до текущего
}