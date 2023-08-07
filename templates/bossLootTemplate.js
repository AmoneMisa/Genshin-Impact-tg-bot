module.exports = {
    gold: [{
        maxAmount: 50000,
        minAmount: 7500,
        from: 0,
        chance: 3
    }, {
        maxAmount: 15000,
        minAmount: 1000,
        from: 3,
        chance: 10
    }, {
        maxAmount: 5500,
        minAmount: 400,
        from: 13,
        chance: 27
    }, {
        maxAmount: 4000,
        minAmount: 150,
        from: 40,
        chance: 60
    }],
    experience: [{
        maxAmount: 37000,
        minAmount: 15000,
        from: 0,
        chance: 3
    }, {
        maxAmount: 29080,
        minAmount: 22100,
        from: 3,
        chance: 10
    }, {
        maxAmount: 18005,
        minAmount: 7560,
        from: 13,
        chance: 27
    }, {
        maxAmount: 6400,
        minAmount: 3000,
        from: 40,
        chance: 60
    }],
    crystals: [{
        maxAmount: 500,
        minAmount: 80,
        from: 0,
        chance: 1
    }, {
        maxAmount: 345,
        minAmount: 30,
        from: 2,
        chance: 4
    }, {
        maxAmount: 230,
        minAmount: 15,
        from: 7,
        chance: 30
    }, {
        maxAmount: 150,
        minAmount: 3,
        from: 38,
        chance: 62
    }],
    // equipment: [{
    //     // Лут выдаётся случайно. Первому месту падает всегда одна вещь, остальным - случайно.
    //     // При этом, первое место может получить дополнительную вещь из числа тех, что выпадают случайно
    //     // session.game.stats.lvl, randomGrade
    //     equipmentLvlModifier: 2,
    //     minAmount: 80,
    //     from: 0,
    //     chance: 1
    // }, {
    //     maxAmount: 345,
    //     minAmount: 30,
    //     from: 2,
    //     chance: 4
    // }, {
    //     maxAmount: 230,
    //     minAmount: 15,
    //     from: 7,
    //     chance: 30
    // }, {
    //     maxAmount: 150,
    //     minAmount: 3,
    //     from: 38,
    //     chance: 62
    // }]
}