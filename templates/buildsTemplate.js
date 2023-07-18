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
            crystals: 22,
            ironOre: 10
        }],
        resourcesType: "gold"
    },
    crystalLake: {
        startLvl: 1,
        name: "Озеро кристаллов",
        description: "Кристальное озеро, которое производит для Вас некоторое количество кристаллов, нужных для развития Вашего персонажа и Ваших построек. Работает непрерывно до 72 часов. Доступно для постройки от 2 уровня дворца",
        productionPerHour: 50,
        maxWorkHoursWithoutCollection: 72,
        upgradeRequirements: [
            {level: 2, buildRequirements: [{name: "palace", level: 3}], characterRequirements: [{name: "lvl", level: 7}]},
            {level: 3, buildRequirements: [{name: "palace", level: 3}], characterRequirements: [{name: "lvl",level: 9}]},
            {level: 4, buildRequirements: [{name: "palace", level: 3}], characterRequirements: [{name: "lvl",level: 10}]},
            {level: 5, buildRequirements: [{name: "palace", level: 4}], characterRequirements: [{name: "lvl",level: 11}]},
            {level: 6, buildRequirements: [{name: "palace", level: 4}], characterRequirements: [{name: "lvl",level: 13}]},
            {level: 7, buildRequirements: [{name: "palace", level: 5}, {name: "goldMine", level: 6}], characterRequirements: [{name: "lvl",level: 14}]},
            {level: 8, buildRequirements: [{name: "palace", level: 5}, {name: "goldMine", level: 6}], characterRequirements: [{name: "lvl",level: 16}]},
            {level: 9, buildRequirements: [{name: "palace", level: 5}, {name: "goldMine", level: 6}], characterRequirements: [{name: "lvl",level: 17}]},
            {level: 10, buildRequirements: [{name: "palace", level: 5}, {name: "goldMine", level: 6}], characterRequirements: [{name: "lvl",level: 17}]},
            {level: 11, buildRequirements: [{name: "palace", level: 6}, {name: "goldMine", level: 7}], characterRequirements: [{name: "lvl",level: 17}]},
            {level: 12, buildRequirements: [{name: "palace", level: 6}, {name: "goldMine", level: 8}], characterRequirements: [{name: "lvl",level: 19}]},
            {level: 13, buildRequirements: [{name: "palace", level: 7}, {name: "goldMine", level: 8}], characterRequirements: [{name: "lvl",level: 19}]},
            {level: 14, buildRequirements: [{name: "palace", level: 7}, {name: "goldMine", level: 8}], characterRequirements: [{name: "lvl",level: 19}]},
            {level: 15, buildRequirements: [{name: "palace", level: 7}, {name: "goldMine", level: 8}], characterRequirements: [{name: "lvl",level: 19}]},
            {level: 16, buildRequirements: [{name: "palace", level: 7}, {name: "goldMine", level: 8}], characterRequirements: [{name: "lvl",level: 19}]},
            {level: 17, buildRequirements: [{name: "palace", level: 9}, {name: "goldMine", level: 13}], characterRequirements: [{name: "lvl",level: 20}]},
            {level: 18, buildRequirements: [{name: "palace", level: 9}, {name: "goldMine", level: 14}], characterRequirements: [{name: "lvl",level: 21}]},
            {level: 19, buildRequirements: [{name: "palace", level: 9}, {name: "goldMine", level: 15}], characterRequirements: [{name: "lvl",level: 22}]},
            {level: 20, buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 16}], characterRequirements: [{name: "lvl",level: 22}]},
            {level: 21, buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 17}], characterRequirements: [{name: "lvl",level: 23}]},
            {level: 22, buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 18}], characterRequirements: [{name: "lvl",level: 24}]},
            {level: 23, buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 19}], characterRequirements: [{name: "lvl",level: 25}]},
            {level: 24, buildRequirements: [{name: "palace", level: 13}, {name: "goldMine", level: 20}], characterRequirements: [{name: "lvl",level: 27}]},
            {level: 25, buildRequirements: [{name: "palace", level: 13}, {name: "goldMine", level: 21}], characterRequirements: [{name: "lvl",level: 27}]},
            {level: 26, buildRequirements: [{name: "palace", level: 15}, {name: "goldMine", level: 22}], characterRequirements: [{name: "lvl",level: 27}]},
            {level: 27, buildRequirements: [{name: "palace", level: 18}, {name: "goldMine", level: 24}], characterRequirements: [{name: "lvl",level: 28}]},
            {level: 28, buildRequirements: [{name: "palace", level: 18}, {name: "goldMine", level: 24}], characterRequirements: [{name: "lvl",level: 29}]},
            {level: 29, buildRequirements: [{name: "palace", level: 18}, {name: "goldMine", level: 23}], characterRequirements: [{name: "lvl",level: 30}]},
            {level: 30, buildRequirements: [{name: "palace", level: 22}, {name: "goldMine", level: 28}], characterRequirements: [{name: "lvl",level: 35}]}
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
        resourcesType: "crystals",
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
        upgradeRequirements: [
            {level: 2, buildRequirements: [{name: "goldMine", level: 3}, {name: "ironDeposit", level: 3}], characterRequirements: [{name: "lvl",level: 5}]},
            {level: 3, buildRequirements: [{name: "ironDeposit", level: 4}, {name: "goldMine", level: 5}], characterRequirements: [{name: "lvl",level: 7}]},
            {level: 4, buildRequirements: [{name: "ironDeposit", level: 5},{name: "goldMine", level: 5}], characterRequirements: [{name: "lvl",level: 8}]},
            {level: 5, buildRequirements: [{name: "ironDeposit", level: 6},{name: "goldMine", level: 6}], characterRequirements: [{name: "lvl",level: 9}]},
            {level: 6, buildRequirements: [{name: "ironDeposit", level: 7},{name: "goldMine", level: 6}], characterRequirements: [{name: "lvl",level: 12}]},
            {level: 7, buildRequirements: [{name: "ironDeposit", level: 8}, {name: "goldMine", level: 7}], characterRequirements: [{name: "lvl",level: 14}]},
            {level: 8, buildRequirements: [{name: "ironDeposit", level: 8}, {name: "goldMine", level: 8}], characterRequirements: [{name: "lvl",level: 15}]},
            {level: 9, buildRequirements: [{name: "ironDeposit", level: 9}, {name: "goldMine", level: 9}, {name: "crystalLake", level: 3}], characterRequirements: [{name: "lvl",level: 15}]},
            {level: 10, buildRequirements: [{name: "ironDeposit", level: 10}, {name: "goldMine", level: 10}], characterRequirements: [{name: "lvl",level: 16}]},
            {level: 11, buildRequirements: [{name: "ironDeposit", level: 11}, {name: "goldMine", level: 11}], characterRequirements: [{name: "lvl",level: 18}]},
            {level: 12, buildRequirements: [{name: "ironDeposit", level: 12}, {name: "goldMine", level: 12}], characterRequirements: [{name: "lvl",level: 18}]},
            {level: 13, buildRequirements: [{name: "ironDeposit", level: 12}, {name: "goldMine", level: 12}], characterRequirements: [{name: "lvl",level: 18}]},
            {level: 14, buildRequirements: [{name: "ironDeposit", level: 13}, {name: "goldMine", level: 12}], characterRequirements: [{name: "lvl",level: 19}]},
            {level: 15, buildRequirements: [{name: "ironDeposit", level: 13}, {name: "goldMine", level: 13}, {name: "crystalLake", level: 7}], characterRequirements: [{name: "lvl",level: 20}]},
            {level: 16, buildRequirements: [{name: "ironDeposit", level: 14}, {name: "goldMine", level: 14}], characterRequirements: [{name: "lvl",level: 20}]},
            {level: 17, buildRequirements: [{name: "ironDeposit", level: 15}, {name: "goldMine", level: 14}], characterRequirements: [{name: "lvl",level: 23}]},
            {level: 18, buildRequirements: [{name: "ironDeposit", level: 15}, {name: "goldMine", level: 15}], characterRequirements: [{name: "lvl",level: 23}]},
            {level: 19, buildRequirements: [{name: "ironDeposit", level: 16}, {name: "goldMine", level: 16}], characterRequirements: [{name: "lvl",level: 25}]},
            {level: 20, buildRequirements: [{name: "ironDeposit", level: 18}, {name: "goldMine", level: 17}, {name: "crystalLake", level: 9}], characterRequirements: [{name: "lvl",level: 25}]},
            {level: 21, buildRequirements: [{name: "ironDeposit", level: 18}, {name: "goldMine", level: 18}], characterRequirements: [{name: "lvl",level: 30}]},
            {level: 22, buildRequirements: [{name: "ironDeposit", level: 20}, {name: "goldMine", level: 20}], characterRequirements: [{name: "lvl",level: 30}]},
            {level: 23, buildRequirements: [{name: "ironDeposit", level: 21}, {name: "goldMine", level: 21}], characterRequirements: [{name: "lvl",level: 33}]},
            {level: 24, buildRequirements: [{name: "ironDeposit", level: 22}, {name: "goldMine", level: 22}], characterRequirements: [{name: "lvl",level: 35}]},
            {level: 25, buildRequirements: [{name: "ironDeposit", level: 22}, {name: "goldMine", level: 22}, {name: "crystalLake", level: 15}], characterRequirements: [{name: "lvl",level: 37}]},
            {level: 26, buildRequirements: [{name: "ironDeposit", level: 22}, {name: "goldMine", level: 23}], characterRequirements: [{name: "lvl",level: 38}]},
            {level: 27, buildRequirements: [{name: "ironDeposit", level: 23}, {name: "goldMine", level: 24}], characterRequirements: [{name: "lvl",level: 39}]},
            {level: 28, buildRequirements: [{name: "ironDeposit", level: 24}, {name: "goldMine", level: 24}, {name: "crystalLake", level: 21}], characterRequirements: [{name: "lvl",level: 40}]},
            {level: 29, buildRequirements: [{name: "ironDeposit", level: 25}, {name: "goldMine", level: 25}], characterRequirements: [{name: "lvl",level: 45}]},
            {level: 30, buildRequirements: [{name: "ironDeposit", level: 28}, {name: "goldMine", level: 30}, {name: "crystalLake", level: 25}], characterRequirements: [{name: "lvl",level: 50}]}
            // Далее для каждого следующего уровня требуется уровень дворца на 1 больше
        ],
        bonusEffect: {
            name: "Казна",
            description: "Защищает определенное количество ресурсов от кражи другими игроками.",
            guardedGold: 20000,
            guardedIronOre: 100,
            guardedCrystals: 500
        },
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
        startLvl: 1,
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
            {level: 2, buildRequirements: [{name: "palace", level: 1}], characterRequirements: [{name: "lvl", level: 1}]},
            {level: 3, buildRequirements: [{name: "palace", level: 1}], characterRequirements: [{name: "lvl", level: 1}]},
            {level: 4, buildRequirements: [{name: "palace", level: 1}], characterRequirements: [{name: "lvl", level: 3}]},
            {level: 5, buildRequirements: [{name: "palace", level: 1}], characterRequirements: [{name: "lvl", level: 4}]},
            {level: 6, buildRequirements: [{name: "palace", level: 2}], characterRequirements: [{name: "lvl", level: 4}]},
            {level: 7, buildRequirements: [{name: "palace", level: 2}, {name: "goldMine", level: 6}], characterRequirements: [{name: "lvl", level: 6}]},
            {level: 8, buildRequirements: [{name: "palace", level: 2}, {name: "goldMine", level: 6}], characterRequirements: [{name: "lvl", level: 6}]},
            {level: 9, buildRequirements: [{name: "palace", level: 3}, {name: "goldMine", level: 6}], characterRequirements: [{name: "lvl", level: 6}]},
            {level: 10, buildRequirements: [{name: "palace", level: 3}, {name: "goldMine", level: 6}], characterRequirements: [{name: "lvl", level: 7}]},
            {level: 11, buildRequirements: [{name: "palace", level: 3}, {name: "goldMine", level: 6}], characterRequirements: [{name: "lvl", level: 7}]},
            {level: 12, buildRequirements: [{name: "palace", level: 5}, {name: "goldMine", level: 8}], characterRequirements: [{name: "lvl", level: 7}]},
            {level: 13, buildRequirements: [{name: "palace", level: 7}, {name: "goldMine", level: 8}], characterRequirements: [{name: "lvl", level: 8}]},
            {level: 14, buildRequirements: [{name: "palace", level: 7}, {name: "goldMine", level: 8}], characterRequirements: [{name: "lvl", level: 8}]},
            {level: 15, buildRequirements: [{name: "palace", level: 8}, {name: "goldMine", level: 8}], characterRequirements: [{name: "lvl", level: 9}]},
            {level: 16, buildRequirements: [{name: "palace", level: 9}, {name: "goldMine", level: 8}], characterRequirements: [{name: "lvl", level: 9}]},
            {level: 17, buildRequirements: [{name: "palace", level: 10}, {name: "goldMine", level: 11}], characterRequirements: [{name: "lvl", level: 9}]},
            {level: 18, buildRequirements: [{name: "palace", level: 10}, {name: "goldMine", level: 11}], characterRequirements: [{name: "lvl", level: 9}]},
            {level: 19, buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 11}], characterRequirements: [{name: "lvl", level: 10}]},
            {level: 20, buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 11}], characterRequirements: [{name: "lvl", level: 12}]},
            {level: 21, buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 12}], characterRequirements: [{name: "lvl", level: 12}]},
            {level: 22, buildRequirements: [{name: "palace", level: 12}, {name: "goldMine", level: 12}], characterRequirements: [{name: "lvl", level: 15}]},
            {level: 23, buildRequirements: [{name: "palace", level: 12}, {name: "goldMine", level: 12}], characterRequirements: [{name: "lvl", level: 15}]},
            {level: 24, buildRequirements: [{name: "palace", level: 13}, {name: "goldMine", level: 14}], characterRequirements: [{name: "lvl", level: 15}]},
            {level: 25, buildRequirements: [{name: "palace", level: 14}, {name: "goldMine", level: 14}], characterRequirements: [{name: "lvl", level: 15}]},
            {level: 26, buildRequirements: [{name: "palace", level: 15}, {name: "goldMine", level: 14}], characterRequirements: [{name: "lvl", level: 18}]},
            {level: 27, buildRequirements: [{name: "palace", level: 16}, {name: "goldMine", level: 18}], characterRequirements: [{name: "lvl", level: 18}]},
            {level: 28, buildRequirements: [{name: "palace", level: 17}, {name: "goldMine", level: 19}], characterRequirements: [{name: "lvl", level: 22}]},
            {level: 29, buildRequirements: [{name: "palace", level: 18}, {name: "goldMine", level: 23}], characterRequirements: [{name: "lvl", level: 24}]},
            {level: 30, buildRequirements: [{name: "palace", level: 19}, {name: "goldMine", level: 25}], characterRequirements: [{name: "lvl", level: 28}]}
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