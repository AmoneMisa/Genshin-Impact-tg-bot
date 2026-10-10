export default {
    academy: {
        name: "Академия",
        description: "Место обучения боевому искусству. Производит очки прокачки навыков (ОП), которые тратятся на усиление скиллов персонажа. Работает до 36 часов автономно. Если вы не соберёте ОП после 36 часов непрерывной работы академии, они перестанут накапливаться.",
        startLvl: 1,
        upgradeTime: [{
            level: 2, time: 0.5,
        }, {
            level: 3, time: 0.5,
        }, {
            level: 4, time: 0.75,
        }, {
            level: 5, time: 0.75,
        }], // часы
        maxLvl: 30,
        productionPerHour: 5,
        available: true,
        maxWorkHoursWithoutCollection: 36,
        upgradeCosts: [{
            level: 2,
            gold: 500,
            moonDew: 15,
            ironOre: 20
        }],
        resourcesType: "sp"
    },
    goldMine: {
        name: "Золотая шахта",
        description: "Основное место для добычи адены. Работает до 36 часов автономно. Если вы не соберёте адену после 36 часов непрерывной работы шахты, она перестанет накапливаться.",
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
            moonDew: 22,
            ironOre: 10
        }],
        resourcesType: "gold"
    },
    crystalLake: {
        startLvl: 1,
        name: "Озеро лунной росы",
        description: "Тихое озеро, из которого по каплям собирается лунная роса — материал для улучшения Ваших построек. Это не кристаллы: кристаллы в постройках не используются. Работает непрерывно до 72 часов. Доступно для постройки от 2 уровня дворца",
        productionPerHour: 50,
        maxWorkHoursWithoutCollection: 72,
        upgradeRequirements: [
            {level: 2, buildRequirements: [{name: "palace", level: 3}], characterRequirements: [{lvl: 7}]},
            {level: 3, buildRequirements: [{name: "palace", level: 3}], characterRequirements: [{lvl: 9}]},
            {level: 4, buildRequirements: [{name: "palace", level: 3}], characterRequirements: [{lvl: 10}]},
            {level: 5, buildRequirements: [{name: "palace", level: 4}], characterRequirements: [{lvl: 11}]},
            {level: 6, buildRequirements: [{name: "palace", level: 4}], characterRequirements: [{lvl: 13}]},
            {
                level: 7,
                buildRequirements: [{name: "palace", level: 5}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 14}]
            },
            {
                level: 8,
                buildRequirements: [{name: "palace", level: 5}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 16}]
            },
            {
                level: 9,
                buildRequirements: [{name: "palace", level: 5}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 17}]
            },
            {
                level: 10,
                buildRequirements: [{name: "palace", level: 5}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 17}]
            },
            {
                level: 11,
                buildRequirements: [{name: "palace", level: 6}, {name: "goldMine", level: 7}],
                characterRequirements: [{lvl: 17}]
            },
            {
                level: 12,
                buildRequirements: [{name: "palace", level: 6}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 19}]
            },
            {
                level: 13,
                buildRequirements: [{name: "palace", level: 7}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 19}]
            },
            {
                level: 14,
                buildRequirements: [{name: "palace", level: 7}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 19}]
            },
            {
                level: 15,
                buildRequirements: [{name: "palace", level: 7}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 19}]
            },
            {
                level: 16,
                buildRequirements: [{name: "palace", level: 7}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 19}]
            },
            {
                level: 17,
                buildRequirements: [{name: "palace", level: 9}, {name: "goldMine", level: 13}],
                characterRequirements: [{lvl: 20}]
            },
            {
                level: 18,
                buildRequirements: [{name: "palace", level: 9}, {name: "goldMine", level: 14}],
                characterRequirements: [{lvl: 21}]
            },
            {
                level: 19,
                buildRequirements: [{name: "palace", level: 9}, {name: "goldMine", level: 15}],
                characterRequirements: [{lvl: 22}]
            },
            {
                level: 20,
                buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 16}],
                characterRequirements: [{lvl: 22}]
            },
            {
                level: 21,
                buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 17}],
                characterRequirements: [{lvl: 23}]
            },
            {
                level: 22,
                buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 18}],
                characterRequirements: [{lvl: 24}]
            },
            {
                level: 23,
                buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 19}],
                characterRequirements: [{lvl: 25}]
            },
            {
                level: 24,
                buildRequirements: [{name: "palace", level: 13}, {name: "goldMine", level: 20}],
                characterRequirements: [{lvl: 27}]
            },
            {
                level: 25,
                buildRequirements: [{name: "palace", level: 13}, {name: "goldMine", level: 21}],
                characterRequirements: [{lvl: 27}]
            },
            {
                level: 26,
                buildRequirements: [{name: "palace", level: 15}, {name: "goldMine", level: 22}],
                characterRequirements: [{lvl: 27}]
            },
            {
                level: 27,
                buildRequirements: [{name: "palace", level: 18}, {name: "goldMine", level: 24}],
                characterRequirements: [{lvl: 28}]
            },
            {
                level: 28,
                buildRequirements: [{name: "palace", level: 18}, {name: "goldMine", level: 24}],
                characterRequirements: [{lvl: 29}]
            },
            {
                level: 29,
                buildRequirements: [{name: "palace", level: 18}, {name: "goldMine", level: 23}],
                characterRequirements: [{lvl: 30}]
            },
            {
                level: 30,
                buildRequirements: [{name: "palace", level: 22}, {name: "goldMine", level: 28}],
                characterRequirements: [{lvl: 35}]
            }
            // Далее для каждого следующего уровня требуется уровень дворца на 1 больше
        ],
        upgradeCosts: [
            {level: 2, gold: 7500, ironOre: 40, moonDew: 0},
            {level: 3, gold: 10000, ironOre: 60, moonDew: 0},
            {level: 4, gold: 12500, ironOre: 80, moonDew: 0},
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
        resourcesType: "moonDew",
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
            level: 2, gold: 2000, ironOre: 60, moonDew: 300
        }],
        maxLvl: 30,
        upgradeRequirements: [
            {
                level: 2,
                buildRequirements: [{name: "goldMine", level: 3}, {name: "ironDeposit", level: 3}],
                characterRequirements: [{lvl: 5}]
            },
            {
                level: 3,
                buildRequirements: [{name: "ironDeposit", level: 4}, {name: "goldMine", level: 5}],
                characterRequirements: [{lvl: 7}]
            },
            {
                level: 4,
                buildRequirements: [{name: "ironDeposit", level: 5}, {name: "goldMine", level: 5}],
                characterRequirements: [{lvl: 8}]
            },
            {
                level: 5,
                buildRequirements: [{name: "ironDeposit", level: 6}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 9}]
            },
            {
                level: 6,
                buildRequirements: [{name: "ironDeposit", level: 7}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 12}]
            },
            {
                level: 7,
                buildRequirements: [{name: "ironDeposit", level: 8}, {name: "goldMine", level: 7}],
                characterRequirements: [{lvl: 14}]
            },
            {
                level: 8,
                buildRequirements: [{name: "ironDeposit", level: 8}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 15}]
            },
            {
                level: 9,
                buildRequirements: [{name: "ironDeposit", level: 9}, {name: "goldMine", level: 9}, {
                    name: "crystalLake",
                    level: 3
                }],
                characterRequirements: [{lvl: 15}]
            },
            {
                level: 10,
                buildRequirements: [{name: "ironDeposit", level: 10}, {name: "goldMine", level: 10}],
                characterRequirements: [{lvl: 16}]
            },
            {
                level: 11,
                buildRequirements: [{name: "ironDeposit", level: 11}, {name: "goldMine", level: 11}],
                characterRequirements: [{lvl: 18}]
            },
            {
                level: 12,
                buildRequirements: [{name: "ironDeposit", level: 12}, {name: "goldMine", level: 12}],
                characterRequirements: [{lvl: 18}]
            },
            {
                level: 13,
                buildRequirements: [{name: "ironDeposit", level: 12}, {name: "goldMine", level: 12}],
                characterRequirements: [{lvl: 18}]
            },
            {
                level: 14,
                buildRequirements: [{name: "ironDeposit", level: 13}, {name: "goldMine", level: 12}],
                characterRequirements: [{lvl: 19}]
            },
            {
                level: 15,
                buildRequirements: [{name: "ironDeposit", level: 13}, {
                    name: "goldMine",
                    level: 13
                }, {name: "crystalLake", level: 7}],
                characterRequirements: [{lvl: 20}]
            },
            {
                level: 16,
                buildRequirements: [{name: "ironDeposit", level: 14}, {name: "goldMine", level: 14}],
                characterRequirements: [{lvl: 20}]
            },
            {
                level: 17,
                buildRequirements: [{name: "ironDeposit", level: 15}, {name: "goldMine", level: 14}],
                characterRequirements: [{lvl: 23}]
            },
            {
                level: 18,
                buildRequirements: [{name: "ironDeposit", level: 15}, {name: "goldMine", level: 15}],
                characterRequirements: [{lvl: 23}]
            },
            {
                level: 19,
                buildRequirements: [{name: "ironDeposit", level: 16}, {name: "goldMine", level: 16}],
                characterRequirements: [{lvl: 25}]
            },
            {
                level: 20,
                buildRequirements: [{name: "ironDeposit", level: 18}, {
                    name: "goldMine",
                    level: 17
                }, {name: "crystalLake", level: 9}],
                characterRequirements: [{lvl: 25}]
            },
            {
                level: 21,
                buildRequirements: [{name: "ironDeposit", level: 18}, {name: "goldMine", level: 18}],
                characterRequirements: [{lvl: 30}]
            },
            {
                level: 22,
                buildRequirements: [{name: "ironDeposit", level: 20}, {name: "goldMine", level: 20}],
                characterRequirements: [{lvl: 30}]
            },
            {
                level: 23,
                buildRequirements: [{name: "ironDeposit", level: 21}, {name: "goldMine", level: 21}],
                characterRequirements: [{lvl: 33}]
            },
            {
                level: 24,
                buildRequirements: [{name: "ironDeposit", level: 22}, {name: "goldMine", level: 22}],
                characterRequirements: [{lvl: 35}]
            },
            {
                level: 25,
                buildRequirements: [{name: "ironDeposit", level: 22}, {
                    name: "goldMine",
                    level: 22
                }, {name: "crystalLake", level: 15}],
                characterRequirements: [{lvl: 37}]
            },
            {
                level: 26,
                buildRequirements: [{name: "ironDeposit", level: 22}, {name: "goldMine", level: 23}],
                characterRequirements: [{lvl: 38}]
            },
            {
                level: 27,
                buildRequirements: [{name: "ironDeposit", level: 23}, {name: "goldMine", level: 24}],
                characterRequirements: [{lvl: 39}]
            },
            {
                level: 28,
                buildRequirements: [{name: "ironDeposit", level: 24}, {
                    name: "goldMine",
                    level: 24
                }, {name: "crystalLake", level: 21}],
                characterRequirements: [{lvl: 40}]
            },
            {
                level: 29,
                buildRequirements: [{name: "ironDeposit", level: 25}, {name: "goldMine", level: 25}],
                characterRequirements: [{lvl: 45}]
            },
            {
                level: 30,
                buildRequirements: [{name: "ironDeposit", level: 28}, {
                    name: "goldMine",
                    level: 30
                }, {name: "crystalLake", level: 25}],
                characterRequirements: [{lvl: 50}]
            }
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
                cost: 33000,
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
                cost: 30000,
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
        description: "Даёт возможность тренироваться персонажу в пассивном режиме. Накапливает очки опыта",
        startLvl: 1,
        productionPerHour: 8000,
        upgradeTime: [{
            level: 2, time: 0.05,
        }, {
            level: 3, time: 0.15,
        }, {
            level: 4, time: 0.35,
        }, {
            level: 5, time: 0.55,
        }], // часы
        upgradeCosts: [{
            level: 2, gold: 4900, ironOre: 30, moonDew: 420
        }],
        maxLvl: 30,
        type: "experience",
        available: true,
        maxWorkHoursWithoutCollection: 54,
        upgradeRequirements: [
            {level: 2, buildRequirements: [{name: "palace", level: 1}], characterRequirements: [{lvl: 5}]},
            {level: 3, buildRequirements: [{name: "palace", level: 1}], characterRequirements: [{lvl: 5}]},
            {level: 4, buildRequirements: [{name: "palace", level: 1}], characterRequirements: [{lvl: 5}]},
            {level: 5, buildRequirements: [{name: "palace", level: 1}], characterRequirements: [{lvl: 5}]},
            {level: 6, buildRequirements: [{name: "palace", level: 2}], characterRequirements: [{lvl: 5}]},
            {
                level: 7,
                buildRequirements: [{name: "palace", level: 2}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 8}]
            },
            {
                level: 8,
                buildRequirements: [{name: "palace", level: 2}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 8}]
            },
            {
                level: 9,
                buildRequirements: [{name: "palace", level: 3}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 8}]
            },
            {
                level: 10,
                buildRequirements: [{name: "palace", level: 3}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 8}]
            },
            {
                level: 11,
                buildRequirements: [{name: "palace", level: 3}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 8}]
            },
            {
                level: 12,
                buildRequirements: [{name: "palace", level: 5}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 16}]
            },
            {
                level: 13,
                buildRequirements: [{name: "palace", level: 7}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 16}]
            },
            {
                level: 14,
                buildRequirements: [{name: "palace", level: 7}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 16}]
            },
            {
                level: 15,
                buildRequirements: [{name: "palace", level: 8}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 16}]
            },
            {
                level: 16,
                buildRequirements: [{name: "palace", level: 9}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 16}]
            },
            {
                level: 17,
                buildRequirements: [{name: "palace", level: 10}, {name: "goldMine", level: 11}],
                characterRequirements: [{lvl: 27}]
            },
            {
                level: 18,
                buildRequirements: [{name: "palace", level: 10}, {name: "goldMine", level: 11}],
                characterRequirements: [{lvl: 27}]
            },
            {
                level: 19,
                buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 11}],
                characterRequirements: [{lvl: 27}]
            },
            {
                level: 20,
                buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 11}],
                characterRequirements: [{lvl: 27}]
            },
            {
                level: 21,
                buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 12}],
                characterRequirements: [{lvl: 36}]
            },
            {
                level: 22,
                buildRequirements: [{name: "palace", level: 12}, {name: "goldMine", level: 12}],
                characterRequirements: [{lvl: 36}]
            },
            {
                level: 23,
                buildRequirements: [{name: "palace", level: 12}, {name: "goldMine", level: 12}],
                characterRequirements: [{lvl: 36}]
            },
            {
                level: 24,
                buildRequirements: [{name: "palace", level: 13}, {name: "goldMine", level: 14}],
                characterRequirements: [{lvl: 55}]
            },
            {
                level: 25,
                buildRequirements: [{name: "palace", level: 14}, {name: "goldMine", level: 14}],
                characterRequirements: [{lvl: 55}]
            },
            {
                level: 26,
                buildRequirements: [{name: "palace", level: 15}, {name: "goldMine", level: 14}],
                characterRequirements: [{lvl: 63}]
            },
            {
                level: 27,
                buildRequirements: [{name: "palace", level: 16}, {name: "goldMine", level: 18}],
                characterRequirements: [{lvl: 63}]
            },
            {
                level: 28,
                buildRequirements: [{name: "palace", level: 17}, {name: "goldMine", level: 19}],
                characterRequirements: [{lvl: 72}]
            },
            {
                level: 29,
                buildRequirements: [{name: "palace", level: 18}, {name: "goldMine", level: 23}],
                characterRequirements: [{lvl: 82}]
            },
            {
                level: 30,
                buildRequirements: [{name: "palace", level: 19}, {name: "goldMine", level: 25}],
                characterRequirements: [{lvl: 85}]
            }
            // Далее для каждого следующего уровня требуется уровень дворца на 1 больше
        ]
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
            {level: 2, buildRequirements: [{name: "palace", level: 1}], characterRequirements: [{lvl: 1}]},
            {level: 3, buildRequirements: [{name: "palace", level: 1}], characterRequirements: [{lvl: 1}]},
            {level: 4, buildRequirements: [{name: "palace", level: 1}], characterRequirements: [{lvl: 3}]},
            {level: 5, buildRequirements: [{name: "palace", level: 1}], characterRequirements: [{lvl: 4}]},
            {level: 6, buildRequirements: [{name: "palace", level: 2}], characterRequirements: [{lvl: 4}]},
            {
                level: 7,
                buildRequirements: [{name: "palace", level: 2}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 6}]
            },
            {
                level: 8,
                buildRequirements: [{name: "palace", level: 2}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 6}]
            },
            {
                level: 9,
                buildRequirements: [{name: "palace", level: 3}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 6}]
            },
            {
                level: 10,
                buildRequirements: [{name: "palace", level: 3}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 7}]
            },
            {
                level: 11,
                buildRequirements: [{name: "palace", level: 3}, {name: "goldMine", level: 6}],
                characterRequirements: [{lvl: 7}]
            },
            {
                level: 12,
                buildRequirements: [{name: "palace", level: 5}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 7}]
            },
            {
                level: 13,
                buildRequirements: [{name: "palace", level: 7}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 8}]
            },
            {
                level: 14,
                buildRequirements: [{name: "palace", level: 7}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 8}]
            },
            {
                level: 15,
                buildRequirements: [{name: "palace", level: 8}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 9}]
            },
            {
                level: 16,
                buildRequirements: [{name: "palace", level: 9}, {name: "goldMine", level: 8}],
                characterRequirements: [{lvl: 9}]
            },
            {
                level: 17,
                buildRequirements: [{name: "palace", level: 10}, {name: "goldMine", level: 11}],
                characterRequirements: [{lvl: 9}]
            },
            {
                level: 18,
                buildRequirements: [{name: "palace", level: 10}, {name: "goldMine", level: 11}],
                characterRequirements: [{lvl: 9}]
            },
            {
                level: 19,
                buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 11}],
                characterRequirements: [{lvl: 10}]
            },
            {
                level: 20,
                buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 11}],
                characterRequirements: [{lvl: 12}]
            },
            {
                level: 21,
                buildRequirements: [{name: "palace", level: 11}, {name: "goldMine", level: 12}],
                characterRequirements: [{lvl: 12}]
            },
            {
                level: 22,
                buildRequirements: [{name: "palace", level: 12}, {name: "goldMine", level: 12}],
                characterRequirements: [{lvl: 15}]
            },
            {
                level: 23,
                buildRequirements: [{name: "palace", level: 12}, {name: "goldMine", level: 12}],
                characterRequirements: [{lvl: 15}]
            },
            {
                level: 24,
                buildRequirements: [{name: "palace", level: 13}, {name: "goldMine", level: 14}],
                characterRequirements: [{lvl: 15}]
            },
            {
                level: 25,
                buildRequirements: [{name: "palace", level: 14}, {name: "goldMine", level: 14}],
                characterRequirements: [{lvl: 15}]
            },
            {
                level: 26,
                buildRequirements: [{name: "palace", level: 15}, {name: "goldMine", level: 14}],
                characterRequirements: [{lvl: 18}]
            },
            {
                level: 27,
                buildRequirements: [{name: "palace", level: 16}, {name: "goldMine", level: 18}],
                characterRequirements: [{lvl: 18}]
            },
            {
                level: 28,
                buildRequirements: [{name: "palace", level: 17}, {name: "goldMine", level: 19}],
                characterRequirements: [{lvl: 22}]
            },
            {
                level: 29,
                buildRequirements: [{name: "palace", level: 18}, {name: "goldMine", level: 23}],
                characterRequirements: [{lvl: 24}]
            },
            {
                level: 30,
                buildRequirements: [{name: "palace", level: 19}, {name: "goldMine", level: 25}],
                characterRequirements: [{lvl: 28}]
            }
            // Далее для каждого следующего уровня требуется уровень дворца на 1 больше
        ],
        upgradeCosts: [
            {level: 2, gold: 800, ironOre: 30, moonDew: 0},
            {level: 3, gold: 1500, ironOre: 45, moonDew: 0},
            {level: 4, gold: 3780, ironOre: 60, moonDew: 0},
            // Далее для каждого следующего уровня стоимость увеличивается
        ],
        buildCost: {
            gold: 1000
        },
        maxLvl: 30,
        resourcesType: "ironOre",
        available: true
    },
    forge: {
        name: "Кузня",
        startLvl: 1,
        description: "Кузня Вашего дворца. С ростом уровня (до 30) повышает шанс крафта, заточки, мастерской работы и двойного крафта, иногда экономит материалы и даёт больше кристаллов при кристаллизации.",
        upgradeRequirements: [
            {level: 2, buildRequirements: [{name: "palace", level: 2}]},
            {level: 3, buildRequirements: [{name: "palace", level: 3}]},
            {level: 4, buildRequirements: [{name: "palace", level: 4}]},
            {level: 5, buildRequirements: [{name: "palace", level: 5}]},
            {level: 6, buildRequirements: [{name: "palace", level: 6}]},
            {level: 7, buildRequirements: [{name: "palace", level: 7}]},
            {level: 8, buildRequirements: [{name: "palace", level: 8}]},
            {level: 9, buildRequirements: [{name: "palace", level: 9}]},
            {level: 10, buildRequirements: [{name: "palace", level: 10}]},
            {level: 11, buildRequirements: [{name: "palace", level: 11}]},
            {level: 12, buildRequirements: [{name: "palace", level: 12}]},
            {level: 13, buildRequirements: [{name: "palace", level: 13}]},
            {level: 14, buildRequirements: [{name: "palace", level: 14}]},
            {level: 15, buildRequirements: [{name: "palace", level: 15}]},
            {level: 16, buildRequirements: [{name: "palace", level: 16}]},
            {level: 17, buildRequirements: [{name: "palace", level: 17}]},
            {level: 18, buildRequirements: [{name: "palace", level: 18}]},
            {level: 19, buildRequirements: [{name: "palace", level: 19}]},
            {level: 20, buildRequirements: [{name: "palace", level: 20}]},
            {level: 21, buildRequirements: [{name: "palace", level: 21}]},
            {level: 22, buildRequirements: [{name: "palace", level: 22}]},
            {level: 23, buildRequirements: [{name: "palace", level: 23}]},
            {level: 24, buildRequirements: [{name: "palace", level: 24}]},
            {level: 25, buildRequirements: [{name: "palace", level: 25}]},
            {level: 26, buildRequirements: [{name: "palace", level: 26}]},
            {level: 27, buildRequirements: [{name: "palace", level: 27}]},
            {level: 28, buildRequirements: [{name: "palace", level: 28}]},
            {level: 29, buildRequirements: [{name: "palace", level: 29}]},
            {level: 30, buildRequirements: [{name: "palace", level: 30}]}
        ],
        upgradeCosts: [
            {level: 2, gold: 35800, ironOre: 240, moonDew: 500},
            {level: 3, gold: 58500, ironOre: 425, moonDew: 640},
            {level: 4, gold: 83780, ironOre: 885, moonDew: 680},
            {level: 5, gold: 155900, ironOre: 1520, moonDew: 795},
            {level: 6, gold: 194250, ironOre: 2585, moonDew: 920},
            {level: 7, gold: 250000, ironOre: 2640, moonDew: 1150},
            {level: 8, gold: 320000, ironOre: 3730, moonDew: 2585},
            {level: 9, gold: 535980, ironOre: 3890, moonDew: 3980},
            {level: 10, gold: 620500, ironOre: 4400, moonDew: 5450},
            {level: 11, gold: 845000, ironOre: 6260, moonDew: 7950},
            {level: 12, gold: 963300, ironOre: 7011, moonDew: 8904},
            {level: 13, gold: 1098200, ironOre: 7852, moonDew: 9972},
            {level: 14, gold: 1251900, ironOre: 8794, moonDew: 11169},
            {level: 15, gold: 1427200, ironOre: 9849, moonDew: 12509},
            {level: 16, gold: 1627000, ironOre: 11031, moonDew: 14010},
            {level: 17, gold: 1854800, ironOre: 12355, moonDew: 15691},
            {level: 18, gold: 2114500, ironOre: 13838, moonDew: 17574},
            {level: 19, gold: 2410500, ironOre: 15499, moonDew: 19683},
            {level: 20, gold: 2748000, ironOre: 17359, moonDew: 22045},
            {level: 21, gold: 3132700, ironOre: 19442, moonDew: 24690},
            {level: 22, gold: 3571300, ironOre: 21775, moonDew: 27653},
            {level: 23, gold: 4071300, ironOre: 24388, moonDew: 30971},
            {level: 24, gold: 4641300, ironOre: 27315, moonDew: 34688},
            {level: 25, gold: 5291100, ironOre: 30593, moonDew: 38851},
            {level: 26, gold: 6031900, ironOre: 34264, moonDew: 43513},
            {level: 27, gold: 6876400, ironOre: 38376, moonDew: 48735},
            {level: 28, gold: 7839100, ironOre: 42981, moonDew: 54583},
            {level: 29, gold: 8936600, ironOre: 48139, moonDew: 61133},
            {level: 30, gold: 10187700, ironOre: 53916, moonDew: 68469},
        ],
        maxLvl: 30,
        available: true
    }
};