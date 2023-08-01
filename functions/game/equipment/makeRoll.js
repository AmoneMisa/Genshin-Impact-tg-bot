module.exports = function (inventory, cost) {
    for (let [costKey, costValue] of Object.entries(cost)) {
        inventory[costKey] -= costValue;
    }
}