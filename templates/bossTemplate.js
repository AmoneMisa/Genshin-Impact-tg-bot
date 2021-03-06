module.exports = {
    name: "Киваха",
    nameCall: "Киваху",
    stats: {
        attack: 10,
        defence: 15,
        minDamage: 250,
        maxDamage: 320,
        criticalChance: 35,
        criticalDamage: 1.25,
        lvl: 1,
        currentSummons: 0,
        needSummons: 3
    },
    loot: {
        gold: [{
            maxAmount: 10000,
            minAmount: 2500,
            from: 0,
            chance: 3
        }, {
            maxAmount: 5000,
            minAmount: 1000,
            from: 3,
            chance: 10
        }, {
            maxAmount: 2500,
            minAmount: 400,
            from: 13,
            chance: 27
        }, {
            maxAmount: 1000,
            minAmount: 150,
            from: 40,
            chance: 60
        }],
        experience: [1000, 750, 500, 400],
        crystals: [{
            maxAmount: 100,
            minAmount: 70,
            from: 0,
            chance: 1
        }, {
            maxAmount: 45,
            minAmount: 30,
            from: 2,
            chance: 4
        }, {
            maxAmount: 30,
            minAmount: 15,
            from: 7,
            chance: 30
        }, {
            maxAmount: 15,
            minAmount: 3,
            from: 38,
            chance: 62
        }]
    },
    skills: [{
        name: "Зеркало",
        description: "Отражает 30% урона",
        effect: "reflect"
    }, {
        name: "Регенерация",
        description: "Каждый час восстанавливает себе определённое количество хп.",
        effect: "hp_regen"
    }, {
        name: "Ярость",
        description: "На половину меньше хп, но рефлект составляет 50% урона.",
        effect: "rage"
    }, {
        name: "Стойкость",
        description: "На 100% больше защиты, но на 40% меньше атаки.",
        effect: "resistance"
    }, {
        name: "Живучесть",
        description: "На 200% больше атаки и защиты",
        effect: "life"
    }]
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