module.exports = {
    name: "pvpSign",
    lvl: 1,
    translatedName: "Медаль Арены",
    lifeTime: 1000 * 60 * 60 * 24 * 30,
    effects: [{name: "increasePvpDamage", value: 1.05}, {name: "decreaseIncomingPvpDamage", value: 0.03}],
    upgrades: [{
        cost: 180,
        effects: [{name: "increasePvpDamage", value: 1.07}, {name: "decreaseIncomingPvpDamage", value: 0.045}]
    }, {
        cost: 298,
        effects: [{name: "increasePvpDamage", value: 1.08}, {name: "decreaseIncomingPvpDamage", value: 0.055}]
    }, {
        cost: 576,
        effects: [{name: "increasePvpDamage", value: 1.093}, {name: "decreaseIncomingPvpDamage", value: 0.064}]
    }, {
        cost: 864,
        effects: [{name: "increasePvpDamage", value: 1.1}, {name: "decreaseIncomingPvpDamage", value: 0.082}]
    }, {
        cost: 1480,
        effects: [{name: "increasePvpDamage", value: 1.115}, {name: "decreaseIncomingPvpDamage", value: 0.097}]
    }, {
        cost: 1868,
        effects: [{name: "increasePvpDamage", value: 1.133}, {name: "decreaseIncomingPvpDamage", value: 0.108}]
    }, {
        cost: 2865,
        effects: [{name: "increasePvpDamage", value: 1.148}, {name: "decreaseIncomingPvpDamage", value: 0.124}]
    }, {
        cost: 4230,
        effects: [{name: "increasePvpDamage", value: 1.165}, {name: "decreaseIncomingPvpDamage", value: 0.146}]
    }]
};