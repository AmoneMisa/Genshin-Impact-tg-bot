const equipmentTemplate = require("../../../templates/equipmentTemplate");
const unequipItem = require("./unequipItem");

module.exports = function (session, item) {
    let [characteristics, penalty] = calcAdditionalStats(session.game, item);

    if (item.isUsed) {
        return 1;
    }

    let isFirst = true;
    for (let slot of item.slots) {
        if (session.game.equipmentStats[slot] !== null) {
            unequipItem(session.game, item, slot);
        }

        if (!isFirst) {
            session.game.equipmentStats[slot] = {
                mainType: item.mainType,
                name: item.name,
                main: null,
                additional: null,
                penalty: null,
                isFilled: true
            }
        }

        session.game.equipmentStats[slot] = {
            mainType: item.mainType,
            name: item.name,
            main: calcMainStats(session.game, item),
            additional: characteristics,
            penalty: penalty,
            isFilled: true
        }

        isFirst = false;
    }

    item.isUsed = true;

    return 0;
}

function calcMainStats(player, item) {
    let penaltyModifier = 1;

    if (!item.classOwner.includes(player.gameClass.stats.name)) {
        penaltyModifier += 0.25;
    }

    let gradeTemplate = equipmentTemplate.grades.find(grade => grade.name === item.grade);
    let minLvl = gradeTemplate.lvl.from;

    if (minLvl > player.stats.lvl) {
        penaltyModifier += 0.65;
    }

    if (item.mainType === "weapon") {
        if (penaltyModifier === 1) {
            return item.characteristics.power;
        }

        return item.characteristics.power * penaltyModifier;
    }

    if (item.mainType === "armor") {
        if (penaltyModifier === 1) {
            return item.characteristics.defence;
        }

        return  item.characteristics.defence * penaltyModifier;
    }

    if (item.mainType === "shield") {
        if (penaltyModifier === 1) {
            return item.characteristics.block;
        }

        return item.characteristics.block * penaltyModifier;
    }
}

function calcAdditionalStats(player, item) {
    let penaltyModifier = 1;
    let newCharacteristics = [];
    let newPenalty = [];

    if (!item.classOwner.includes(player.gameClass.stats.name)) {
        penaltyModifier += 0.45;
    }

    let gradeTemplate = equipmentTemplate.grades.find(grade => grade.name === item.grade);
    let minLvl = gradeTemplate.lvl.from;

    if (minLvl > player.stats.lvl) {
        penaltyModifier += 0.45;
    }

    for (let [characteristicName, characteristicValue] of Object.entries(item.characteristics)) {
        if (penaltyModifier === 1) {
            newCharacteristics.push({characteristicName, characteristicValue});
        } else {
            newCharacteristics.push({characteristicName, characteristicValue: characteristicValue * penaltyModifier});

        }
    }

    if (item.penalty) {
        for (let [characteristicName, characteristicValue] of Object.entries(item.penalty)) {
            if (penaltyModifier === 1) {
                newPenalty.push({characteristicName, characteristicValue});
            } else {
                newPenalty.push({characteristicName, characteristicValue: characteristicValue * (1 + penaltyModifier)});
            }
        }
    }

    return [newCharacteristics, newPenalty];
}