module.exports = function (session, statName, isMul = false) {
    if (!session.game || !session.game.equipmentStats) {
        return;
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

        if (session.game.stats.lvl < slot.minLvl) {
            totalStatValue *= 0.65;
        }

        if (slot.classOwner && !slot.classOwner.includes(session.game.gameClass.stats.name)) {
            totalStatValue *= 0.25;
        }

    }
    return totalStatValue;
}