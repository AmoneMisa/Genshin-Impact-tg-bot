module.exports = {
    gold: [{
        value: { maxAmount: 50000, minAmount: 17500 },
        chance: 0.03
    }, {
        value: { maxAmount: 15000, minAmount: 1000 },
        chance: 0.1
    }, {
        value: { maxAmount: 5500, minAmount: 600 },
        chance: 0.27
    }, {
        value: { maxAmount: 4000, minAmount: 550 },
        chance: 0.6
    }],
    experience: [{
        value: { maxAmount: 37000, minAmount: 15000 },
        chance: 0.03
    }, {
        value: { maxAmount: 29080, minAmount: 22100 },
        chance: 0.1
    }, {
        value: { maxAmount: 18005, minAmount: 7560 },
        chance: 0.27
    }, {
        value: { maxAmount: 6400, minAmount: 3000 },
        chance: 0.6
    }],
    crystals: [{
        value: { maxAmount: 500, minAmount: 80 },
        chance: 0.01
    }, {
        value: { maxAmount: 345, minAmount: 30 },
        chance: 0.04
    }, {
        value: { maxAmount: 230, minAmount: 15 },
        chance: 0.33
    }, {
        value: { maxAmount: 150, minAmount: 3 },
        chance: 0.62
    }],
    equipment: [{
        // Лут выдаётся случайно. Первому месту падает всегда одна вещь, остальным - случайно.
        // При этом, первое место может получить дополнительную вещь из числа тех, что выпадают случайно
        value: 0.65,
        chance: 0.01
    }, {
        value: 0.35,
        chance: 0.07
    }, {
        value: 0.25,
        chance: 0.3
    }, {
        value: 0.15,
        chance: 0.62
    }]
}