module.exports = function (session, statName, isMul = false) {
    if (!session.game || !session.game.equipmentStats) {
        return 1;
    }

    let totalStatValue = (statName === "defencePower" || statName === "power") ? 1 : 0;

    if (isMul) {
        totalStatValue = 1;
    }

    for (let slot of Object.values(session.game.equipmentStats)) {
        if (!slot) {
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