module.exports = {
    academy: {
        name: "Академия",
        startLvl: 0,
        updateCostGold: 500,
        updateCostCrystal: 100,
        timeForUpdate: 10,
        maxLvl: 20,
        type: "academy",
        available: false
    },
    goldMine: {
        name: "Золотая шахта",
        startLvl: 1,
        updateCostGold: 300,
        updateCostCrystal: 20,
        upgradeTime: 15,
        maxLvl: 30,
        perHour: 1000,
        available: true,
        upgradeCosts: {
            level: 2,
            gold: 320,
            crystal: 22,
            ironOre: 10
        }
    },
    crystalLake: {
        name: "Озеро кристаллов",
        description: "Кристальное озеро, которое производит для Вас некоторое количество кристаллов, нужных для развития Вашего персонажа и Ваших построек.",
        crystalIncomePerHour: 50,
        maxWorkHoursWithoutCollection: 72,
        upgradeRequirements: [
            { level: 2, palaceLevel: 2 },
            { level: 3, palaceLevel: 2 },
            { level: 4, palaceLevel: 3 },
            { level: 5, palaceLevel: 3 },
            { level: 6, palaceLevel: 4 },
            { level: 7, palaceLevel: 4 },
            { level: 8, palaceLevel: 5 },
            { level: 9, palaceLevel: 5 },
            { level: 10, palaceLevel: 6 },
            // Далее для каждого следующего уровня требуется уровень дворца на 1 больше
        ],
        upgradeCosts: [
            { level: 2, gold: 7500, ironOre: 40, crystals: 0 },
            { level: 3, gold: 10000, ironOre: 60, crystals: 0 },
            { level: 4, gold: 12500, ironOre: 80, crystals: 0 },
            // Далее для каждого следующего уровня стоимость увеличивается
        ],
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
        description: "Ваше главное здание. Вы можете выбрать его внешний вид через меню дворца. В зависимости от его уровня," +
            " зависит максимальный доступный уровень Ваших остальных построек.",
        upgradeTime: 6, // часы
        upgradeCost: {
            gold: 2000,
            ironOre: 60,
            crystals: 300
        },
        maxLvl: 30,
        minCharacterLevel: 5,
        bonusEffect: {
            name: "Казна",
            description: "Защищает определенное количество ресурсов от кражи другими игроками.",
            guardedGold: 20000,
            guardedIronOre: 100,
            guardedCrystals: 500
        },
        upgrades: [],
        available: true
    },
    traineeArea: {
        name: "Тренировочная площадка",
        startLvl: 0,
        updateCostGold: 500,
        updateCostCrystal: 100,
        timeForUpdate: 10,
        maxLvl: -1,
        type: "bonus",
        available: false
    },
    ironDeposit: {
        name: "Залежи железной руды",
        description: "Ваши месторождения железной руды. Она необходима для улучшения оружия, брони и построек.",
        ironOreProductionPerHour: 5,
        maxWorkHoursWithoutCollection: 36,
        upgradeRequirements: [
            { level: 2, palaceLevel: 1 },
            { level: 3, palaceLevel: 1 },
            { level: 4, palaceLevel: 1 },
            { level: 5, palaceLevel: 1 },
            { level: 6, palaceLevel: 2 },
            // Далее для каждого следующего уровня требуется уровень дворца на 1 больше
        ],
        upgradeCosts: [
            { level: 2, gold: 800, ironOre: 30, crystals: 0 },
            { level: 3, gold: 1500, ironOre: 45, crystals: 0 },
            { level: 4, gold: 3780, ironOre: 60, crystals: 0 },
            // Далее для каждого следующего уровня стоимость увеличивается
        ],
        buildCost: {
            gold: 1000
        },
        maxLvl: 30,
        available: true
    }
};