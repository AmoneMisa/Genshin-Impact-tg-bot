module.exports = {
    name: "Киваха",
    nameCall: "Киваху",
    lvls: [{
            loot: {
                weapons: {
                    swords: [{
                        name: "Железный меч [**]",
                        damage: "2-5 урона",
                        chance: "60%",
                        bonus: null
                    }, {
                        name: "Медный меч [*]",
                        damage: "1-3 урона",
                        chance: "80%",
                        bonus: null
                    }, {
                        name: "Классический меч [***]",
                        damage: "5-15 урона",
                        change: "5%",
                        bonus: {
                            gold: true,
                            amount: 5
                        }
                    }],
                    bows: [{
                        name: "Коряга [*]",
                        damage: "2-4 урона",
                        chance: "80%",
                        bonus: null
                    }, {
                        name: "Деревянный прочный лук [**]",
                        damage: "6-8 урона",
                        chance: "30%",
                        bonus: null
                    }, {
                        name: "Крепкий лук [***]",
                        damage: "10-18 урона",
                        chance: "5%",
                        bonus: {
                            experience: true,
                            amount: 15
                        }
                    }]
                },
                gold: [{
                    maxAmount: 1000,
                    minAmount: 150,
                    chance: 90
                }, {
                    maxAmount: 2500,
                    minAmount: 400,
                    chance: 30
                }, {
                    maxAmount: 5000,
                    minAmount: 1000,
                    chance: 10
                }, {
                    maxAmount: 10000,
                    minAmount: 2500,
                    chance: 3
                }],
                experience: [1000, 750, 500, 400],
                title: "Гроза всемогущего Кивахи"
            }}, {
            loot: {
                weapons: {
                    swords: [{
                        name: "Железный меч [**]",
                        damage: "2-5 урона",
                        chance: "80%",
                        bonus: null
                    }, {
                        name: "Рыцарский меч [**]",
                        damage: "3-6 урона",
                        chance: "50%",
                        bonus: null
                    }, {
                        name: "Классический меч [***]",
                        damage: "5-15 урона",
                        change: "12%",
                        bonus: {
                            gold: true,
                            amount: 5
                        }
                    }],
                    bows: [{
                        name: "Самодельный лук [**]",
                        damage: "2-4 урона",
                        chance: "70%",
                        bonus: null
                    }, {
                        name: "Деревянный прочный лук [**]",
                        damage: "6-8 урона",
                        chance: "50%",
                        bonus: null
                    }, {
                        name: "Крепкий лук [***]",
                        damage: "10-18 урона",
                        chance: "12%",
                        bonus: {
                            experience: true,
                            amount: 15
                        }
                    }]
                },
                gold: [{
                    maxAmount: 2500,
                    minAmount: 350,
                    chance: 90
                }, {
                    maxAmount: 3500,
                    minAmount: 600,
                    chance: 30
                }, {
                    maxAmount: 7000,
                    minAmount: 3000,
                    chance: 10
                }, {
                    maxAmount: 12000,
                    minAmount: 4000,
                    chance: 3
                }],
                experience: [{amount: 3000}, {amount: 1750}, {amount: 1500}, {amount: 900}],
                title: "Убийца всемогущего Кивахи"
            }
        }
    ]
};

// ,
// 2: {
//     name: "Арами"
// },
// 3: {
//     name: "Лорелляй"
// },
// 4: {
//     name: "Джахар"
// },
// 5: {
//     name: "Диана"
// }