const equipmentTemplate = require("../../../templates/equipmentTemplate");
const equipmentBonusStatsTemplate = require("../../../templates/equipmentBonusStatsTemplate");
const getRandom = require("../../getters/getRandom");
const getRandomWithoutFloor = require("../../getters/getRandomWithoutFloor");
const getValueByChance = require("../../getters/getValueByChance");
const getNewChancesArrayByValue = require("../../getters/getNewChancesArrayByValue");
const equipmentDictionary = require("../../../dictionaries/equipment");

module.exports = function (gameClass, currentLvl, grade) {
    let buildItem = getItemData(gameClass, currentLvl, grade);
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
        penalty: buildItem.kind.penalty,
        translatedName: buildItem.kind.translatedName,
        slots: buildItem.kind.slots,
        stats: buildItem.stats,
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

function getItemData(gameClass, currentLvl, calledGrade) {
    const grade = getItemGrade(currentLvl, calledGrade);
    const {mainType, kind} = getItemType();
    const {quality, maxQuality} = getItemQuality(grade);
    const {persistence, maxPersistence} = getItemPersistence(grade);
    const stats = getItemAdditionalStats(grade);
    const rarity = getItemRarity(stats.length);

    return {
        grade,
        quality,
        maxQuality,
        persistence,
        maxPersistence,
        rarity,
        mainType,
        kind,
        stats
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
function getItemAdditionalStats(itemGrade) {
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

    return getRandomItemStats(getValueByChance(chance, chances), itemGrade);
}

function getRandomItemStats(count, grade) {
    const possibleStats = [
        "attack",
        "defence",
        "criticalChance",
        "criticalDamage",
        "reduceIncomingDamage",
        "additionalDamage",
        "maxHp",
        "maxCp",
        "maxMp",
        "hpRestoreSpeed",
        "mpRestoreSpeed",
        "cpRestoreSpeed",
        "speed",
        "block",
        "accuracy",
        "evasion"
    ];

    let characteristics = [];

    while (characteristics.length < count) {
        let randomStat = possibleStats[getRandom(0, possibleStats.length - 1)];
        if (characteristics.includes(randomStat)) {
            continue;
        }

        let stat = {name: randomStat, value: setItemStatsValue(randomStat, grade)}
        characteristics.push(stat);
    }

    return characteristics;
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
    let gradePrice = equipmentTemplate.grades.find(grade => grade.name === item.grade.name).cost;
    let rarityPrice = equipmentTemplate.rarity.find(rarity => rarity.name === item.rarity.name).cost;
    let setPrice = item.isSet ? 65000 : 0;
    let qualityPrice = 300 + (item.quality / 100) * (100000 - 300);
    let persistencePrice = 90 + (item.persistence / 100) * (8900 - 90);

    return Math.floor(gradePrice + rarityPrice + setPrice + qualityPrice + persistencePrice);

//Стоимость в золоте:
// Базовая стоимость класса снаряжения
// (noGrade - 100 золота, D - 1200, C - 3400, B - 7000, A - 55000, S - 136000, SS - 223000, SSS 1890000) +
// Базовая стоимость редкости снаряжения (серый - 50, белый - 160, зелёный - 600, синий - 5000, фиолетовый - 8900,
// золотой - 25000, красный - 197000, радужный - 435000, голубой - 6500000) +
// если снаряжение принадлежит к сэту снаряжения (набор снаряжения будет указан в отдельном списке.), то 65000 +
// качество снаряжения (от 300 до 100000 в зависимости от количества единиц качества) +
// прочность снаряжения (от 90 до 8900 в зависимости от максимальных единиц прочности).
}