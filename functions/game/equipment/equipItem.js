const unequipItem = require("./unequipItem");

module.exports = function (session, item) {
    let [characteristics, penalty] = setAdditionalStats(session.game, item);

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
    if (item.mainType === "weapon") {
        return item.characteristics.power;
    }

    if (item.mainType === "armor") {
        return item.characteristics.defence;
    }

    if (item.mainType === "shield") {
        return item.characteristics.block;
    }
}

function setAdditionalStats(player, item) {
    let newCharacteristics = [];
    let newPenalty = [];

    for (let [characteristicName, characteristicValue] of Object.entries(item.characteristics)) {
        newCharacteristics.push({characteristicName, characteristicValue});
    }

    if (item.penalty) {
        for (let [characteristicName, characteristicValue] of Object.entries(item.penalty)) {
            newPenalty.push({characteristicName, characteristicValue});
        }
    }

    return [newCharacteristics, newPenalty];
}