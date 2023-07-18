module.exports = function (playerEffects) {
    let multiplier = 1;

    for (let effect of playerEffects) {
        if (effect.name === "addDamage") {
            multiplier *= 1 + effect.amount / 100;
        }
    }

    return multiplier;
};