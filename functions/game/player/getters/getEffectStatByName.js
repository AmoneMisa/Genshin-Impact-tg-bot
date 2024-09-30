export default function (session, statName, isMul = false) {
    if (!session.game || !session.game.effects) {
        return 1;
    }

    let totalStatValue = 0;

    if (isMul) {
        totalStatValue = 1;
    }

    for (let effect of session.game.effects) {
        if (!effect) {
            continue;
        }

        for (let [statKey, statValue] of Object.entries(slot.characteristics)) {

            if (statKey !== statName) {
                continue;
            }

            if (isMul) {
                totalStatValue *= statValue;
            } else {
                totalStatValue += statValue;
            }
        }
    }
    return totalStatValue;
}

function getEffect(effectName) {
    return [ , effect, target] = effectName.match(/(add\w+)(?!To)(\w+)$/);
}