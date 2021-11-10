module.exports = function (session) {
    let multiplier = 1;

    for (let effect of session.game.effects) {
        if (effect.name === "add_damage") {
            multiplier *= 1 + effect.amount / 100;
        }
    }

    return multiplier;
};