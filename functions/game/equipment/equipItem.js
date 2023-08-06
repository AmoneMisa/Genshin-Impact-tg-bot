const unequipItem = require("./unequipItem");
const equipmentTemplate = require("../../../templates/equipmentTemplate");
const updatePlayerStats = require("../player/updatePlayerStats");

module.exports = function (session, item) {
    let characteristics = setStats(session.game, item);

    if (item.isUsed) {
        return 1;
    }

    let isFirst = true;
    let equipTemplateGrade = equipmentTemplate.grades.find(grade => grade.name === item.grade);
    unequipItem(session, item);

    for (let slot of item.slots) {
        if (!isFirst) {
            session.game.equipmentStats[slot] = {
                mainType: item.mainType,
                name: item.name,
                characteristics: null,
                isFilled: true
            }
        }

        session.game.equipmentStats[slot] = {
            mainType: item.mainType,
            name: item.name,
            minLvl: equipTemplateGrade.lvl.from,
            classOwner: item.classOwner,
            characteristics,
            isFilled: true
        }

        isFirst = false;
    }

    item.isUsed = true;
    updatePlayerStats(session);

    return 0;
}

function getMainStats(player, item) {
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

function setStats(player, item) {
    let statName;
    switch (item.mainType) {
        case "weapon": {
            statName = "power";
            break;
        }
        case "armor": {
            statName = "defencePower";
            break;
        }
        case "shield": {
            statName = "block";
            break;
        }
    }

    let newStats = [];
    newStats.push({name: statName, value: getMainStats(player, item), type: "main"});

    for (let [name, value] of Object.entries(item.characteristics)) {
        newStats.push({name, value, type: "additional"});
    }

    if (item.penalty) {
        for (let [name, value] of Object.entries(item.penalty)) {
            newStats.push({name, value, type: "penalty"});
        }
    }

    return newStats;
}