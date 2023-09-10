module.exports = function (session) {
    if (!session.game || !session.game.equipmentStats) {
        return false;
    }

    for (let slot of Object.values(session.game.equipmentStats)) {
        if (!slot) {
            continue;
        }

        if (session.game.stats.lvl < slot.minLvl) {
            return true;
        }
    }

    return false;
}