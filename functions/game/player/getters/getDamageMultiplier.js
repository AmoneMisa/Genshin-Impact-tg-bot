export default function (playerEffects) {
    let multiplier = 1;

    for (let effect of playerEffects) {
        if (effect.name === "addDamageToBoss") {
            multiplier *= 1 + effect.amount / 100;
        }
    }

    return multiplier;
};