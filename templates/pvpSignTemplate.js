module.exports = {
    name: "pvpSign",
    translatedName: "Медаль Арены",
    lvl: 1,
    lifeTime: 1000 * 60 * 60 * 24 * 30,
    effects: [{name: "increasePvpDamage", value: 0.05}, {name: "decreaseIncomingPvpDamage", value: 0.03}],
    upgrades: [{
        cost: 180,
        effects: [{name: "increasePvpDamage", value: 0.07}, {name: "decreaseIncomingPvpDamage", value: 0.045}]
    }, {
        cost: 298,
        effects: [{name: "increasePvpDamage", value: 0.08}, {name: "decreaseIncomingPvpDamage", value: 0.055}]
    }, {
        cost: 576,
        effects: [{name: "increasePvpDamage", value: 0.093}, {name: "decreaseIncomingPvpDamage", value: 0.064}]
    }, {
        cost: 864,
        effects: [{name: "increasePvpDamage", value: 0.1}, {name: "decreaseIncomingPvpDamage", value: 0.082}]
    }, {
        cost: 1480,
        effects: [{name: "increasePvpDamage", value: 0.115}, {name: "decreaseIncomingPvpDamage", value: 0.097}]
    }, {
        cost: 1868,
        effects: [{name: "increasePvpDamage", value: 0.133}, {name: "decreaseIncomingPvpDamage", value: 0.108}]
    }, {
        cost: 2865,
        effects: [{name: "increasePvpDamage", value: 0.148}, {name: "decreaseIncomingPvpDamage", value: 0.124}]
    }, {
        cost: 4230,
        effects: [{name: "increasePvpDamage", value: 0.165}, {name: "decreaseIncomingPvpDamage", value: 0.146}]
    }]
};