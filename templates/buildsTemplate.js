module.exports = {
    academy: {
        name: "Академия",
        startLvl: 0,
        updateCostGold: 500,
        updateCostCrystal: 100,
        timeForUpdate: 10,
        maxLvl: 20,
        type: "academy",
        available: true
    },
    goldMine: {
        name: "Золотая шахта",
        startLvl: 1,
        updateCostGold: 300,
        updateCostCrystal: 20,
        timeForUpdate: 10,
        maxLvl: -1,
        type: "resources",
        perHour: 1000,
        available: true
    },
    crystalLake: {
        name: "Озеро кристаллов",
        startLvl: 0,
        updateCostGold: 500,
        updateCostCrystal: 40,
        timeForUpdate: 10,
        maxLvl: -1,
        type: "resources",
        perHour: 60,
        available: true
    },
    shop: {
        name: "Магазин",
        startLvl: 0,
        updateCostGold: 500,
        updateCostCrystal: 100,
        timeForUpdate: 10,
        maxLvl: 20,
        type: "shop",
        available: false
    },
    home: {
        name: "Дворец",
        startLvl: 1,
        updateCostGold: 500,
        updateCostCrystal: 100,
        timeForUpdate: 10,
        maxLvl: -1,
        type: "bonus"
    },
    traineeArea: {
        name: "Тренировочная площадка",
        startLvl: 0,
        updateCostGold: 500,
        updateCostCrystal: 100,
        timeForUpdate: 10,
        maxLvl: -1,
        type: "bonus",
        available: true
    },
    ironDeposit: {
        name: "Месторождение руды",
        startLvl: 0,
        updateCostGold: 500,
        updateCostCrystal: 100,
        timeForUpdate: 10,
        maxLvl: -1,
        type: "resources",
        perHour: 20,
        available: false
    }
};