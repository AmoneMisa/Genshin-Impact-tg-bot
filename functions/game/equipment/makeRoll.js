const getValueByChance = require("../../getters/getValueByChance");
module.exports = function (inventory, spin) {
    for (let [costKey, costValue] of Object.entries(spin.spinCost)) {
        inventory[costKey] -= costValue;
    }

    let chance = Math.random();
    return getValueByChance(chance, spin.gradesForSpin);
}