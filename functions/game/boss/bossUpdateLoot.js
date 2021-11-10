const getBossLevel = require("./getBossLevel");

module.exports = function (boss) {
    let lvl = getBossLevel(boss) - 1;

    return {
        gold: [{
            maxAmount: 10000 + 1000 * lvl,
            minAmount: 2500 + 200 * lvl,
            from: 0,
            chance: 3
        }, {
            maxAmount: 5000 + 500 * lvl,
            minAmount: 1000 + 150 * lvl,
            from: 3,
            chance: 10
        }, {
            maxAmount: 2500 + 250 * lvl,
            minAmount: 400 + 60 * lvl,
            from: 13,
            chance: 27
        }, {
            maxAmount: 1000 + 120 * lvl,
            minAmount: 150 + 30 * lvl,
            from: 40,
            chance: 60
        }],
        experience: [1000 + 500 * lvl, 750 + 300 * lvl, 500 + 200 * lvl, 400 + 150 * lvl],
        crystals: [{
            maxAmount: 100 + 20 * lvl,
            minAmount: 70 + 15 * lvl,
            from: 0,
            chance: 1
        }, {
            maxAmount: 45 + 12 * lvl,
            minAmount: 30 + 8 * lvl,
            from: 2,
            chance: 4
        }, {
            maxAmount: 30 + 10 * lvl,
            minAmount: 15 + 5 * lvl,
            from: 7,
            chance: 30
        }, {
            maxAmount: 15 + 8 * lvl,
            minAmount: 3 + 3 * lvl,
            from: 38,
            chance: 62
        }]
    }
};