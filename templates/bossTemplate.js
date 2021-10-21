module.exports = {
    name: "Киваха",
    nameCall: "Киваху",
    loot: {
        gold: [{
            maxAmount: 10000,
            minAmount: 2500,
            from: 0,
            chance: 3
        }, {
            maxAmount: 5000,
            minAmount: 1000,
            from: 4,
            chance: 10
        }, {
            maxAmount: 2500,
            minAmount: 400,
            from: 11,
            chance: 27
        }, {
            maxAmount: 1000,
            minAmount: 150,
            from: 28,
            chance: 60
        }],
        experience: [1000, 750, 500, 400],
        title: "Гроза всемогущего Кивахи"
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