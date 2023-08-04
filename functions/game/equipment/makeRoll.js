const getValueByChance = require("../../getters/getValueByChance");

module.exports = function (player, spin, isFree) {
    let chance = Math.random();

    if (isFree) {
        return getValueByChance(chance, spin.gradesForSpin);
    }

    for (let [costKey, costValue] of Object.entries(spin.spinCost)) {
        player.inventory[costKey] -= costValue;
    }

    return getValueByChance(chance, spin.gradesForSpin);
}