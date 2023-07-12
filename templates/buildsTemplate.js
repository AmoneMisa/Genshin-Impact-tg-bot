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
        description: "Основное место для добычи золота. Работает до 36 часов автономно. Если вы не соберёте золото после 36 часов непрерывной работы шахты, оно перестанет накапливаться.",
        startLvl: 1,
        updateCostGold: 300,
        updateCostCrystal: 20,
        upgradeTime: [{
            level: 2, time: 0.25,
        }, {
            level: 3, time: 0.25,
        }, {
            level: 4, time: 0.25,
        }, {
            level: 5, time: 0.25,
        }], // часы
        maxLvl: 30,
        productionPerHour: 1000,
        available: true,
        maxWorkHoursWithoutCollection: 36,
        upgradeCosts: [{
            level: 2,
            gold: 320,
            crystal: 22,
            ironOre: 10
        }],
        resourcesType: "gold"
    },
    crystalLake: {
        startLvl: 0,
        name: "Озеро кристаллов",
        description: "Кристальное озеро, которое производит для Вас некоторое количество кристаллов, нужных для развития Вашего персонажа и Ваших построек. Работает непрерывно до 72 часов. Доступно для постройки от 2 уровня дворца",
        productionPerHour: 50,
        maxWorkHoursWithoutCollection: 72,
        upgradeRequirements: [
            {level: 2, palaceLevel: 2},
            {level: 3, palaceLevel: 2},
            {level: 4, palaceLevel: 3},
            {level: 5, palaceLevel: 3},
            {level: 6, palaceLevel: 4},
            {level: 7, palaceLevel: 4},
            {level: 8, palaceLevel: 5},
            {level: 9, palaceLevel: 5},
            {level: 10, palaceLevel: 6},
            // Далее для каждого следующего уровня требуется уровень дворца на 1 больше
        ],
        upgradeCosts: [
            {level: 2, gold: 7500, ironOre: 40, crystals: 0},
            {level: 3, gold: 10000, ironOre: 60, crystals: 0},
            {level: 4, gold: 12500, ironOre: 80, crystals: 0},
            // Далее для каждого следующего уровня стоимость увеличивается
        ],
        upgradeTime: [{
            level: 2, time: 0.15,
        }, {
            level: 3, time: 0.25,
        }, {
            level: 4, time: 0.35,
        }, {
            level: 5, time: 0.55,
        }], // часы
        resourcesType: "crystal",
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
    palace: {
        name: "Дворец",
        startLvl: 1,
        description: "Ваше главное здание. Вы можете выбрать его внешний вид через меню дворца. В зависимости от его уровня," +
            " зависит максимальный доступный уровень Ваших остальных построек.",
        upgradeTime: [{
            level: 2, time: 2,
        }, {
            level: 3, time: 2.5,
        }, {
            level: 4, time: 3,
        }, {
            level: 5, time: 6,
        }], // часы
        upgradeCosts: [{
            level: 2, gold: 2000, ironOre: 60, crystals: 300
        }],
        maxLvl: 30,
        minCharacterLevel: 5,
        bonusEffect: {
            name: "Казна",
            description: "Защищает определенное количество ресурсов от кражи другими игроками.",
            guardedGold: 20000,
            guardedIronOre: 100,
            guardedCrystals: 500
        },
        upgrades: [
            {
                level: 3,
                guardedGold: 50000,
                guardedIronOre: 200,
                guardedCrystals: 700
            }
        ],
        availableTypes: {
            common: {
                name: "Обычный",
                isPayment: false
            },
            royal: {
                name: "Королевский",
                isPayment: true,
                cost: 30000,
                bonus: {
                    description: "Даёт +5% к атаке персонажа",
                    name: "Рыцарская доблесть",
                    effect: {
                        value: 5,
                        to: "attack"
                    }
                }
            },
            elven: {
                name: "Эльфийский",
                isPayment: true,
                cost: 33000,
                bonus: {
                    description: "Даёт +7% к атаке персонажа",
                    name: "Эльфийская точность",
                    effect: {
                        value: 7,
                        to: "attack"
                    }
                }
            }
        },
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
        description: "Ваши месторождения железной руды. Она необходима для улучшения оружия, брони и построек. Работает непрерывно до 36 часов.",
        productionPerHour: 5,
        upgradeTime: [{
            level: 2, time: 0.25,
        }, {
            level: 3, time: 0.25,
        }, {
            level: 4, time: 0.25,
        }, {
            level: 5, time: 0.25,
        }],
        maxWorkHoursWithoutCollection: 36,
        upgradeRequirements: [
            {level: 2, palaceLevel: 1},
            {level: 3, palaceLevel: 1},
            {level: 4, palaceLevel: 1},
            {level: 5, palaceLevel: 1},
            {level: 6, palaceLevel: 2},
            // Далее для каждого следующего уровня требуется уровень дворца на 1 больше
        ],
        upgradeCosts: [
            {level: 2, gold: 800, ironOre: 30, crystals: 0},
            {level: 3, gold: 1500, ironOre: 45, crystals: 0},
            {level: 4, gold: 3780, ironOre: 60, crystals: 0},
            // Далее для каждого следующего уровня стоимость увеличивается
        ],
        buildCost: {
            gold: 1000
        },
        maxLvl: 30,
        resourcesType: "ironOre",
        available: true
    }
};