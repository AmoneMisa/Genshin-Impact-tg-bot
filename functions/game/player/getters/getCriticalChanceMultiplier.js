module.exports = function (session) {
    let multiplier = 1;

    for (let effect of session.game.effects) {
        if (effect.name === "addCritChanceToBoss") {
            multiplier *= 1 + effect.amount;
        }
    }

    return multiplier;
};