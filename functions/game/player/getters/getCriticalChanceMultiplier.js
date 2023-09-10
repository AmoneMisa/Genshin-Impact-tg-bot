module.exports = function (session) {
    let multiplier = 1;

    if (!session.game || !session.game.effects) {
        return multiplier;
    }

    for (let effect of session.game.effects) {
        if (effect.name === "addCritChanceToBoss") {
            multiplier *= 1 + effect.amount;
        }
    }

    return multiplier;
};