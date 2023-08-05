module.exports = function (session, statName) {
    let statValue = (statName === "defencePower" || statName === "power") ? 1 : 0;

    for (let slot of Object.values(session.game.equipmentStats)) {
        if (!slot) {
            continue;
        }

        for (let stat of slot.characteristics) {
            if (stat.name !== statName) {
                continue;
            }

            if (stat.type !== "penalty") {
                statValue += stat.value;
            } else {
                statValue -= stat.value;
            }
        }

        if (session.game.stats.lvl < slot.minLvl) {
            statValue *= 0.65;
        }

        if (slot.classOwner && !slot.classOwner.includes(session.game.gameClass.stats.name)) {
            statValue *= 0.25;
        }

    }
    return statValue;
}