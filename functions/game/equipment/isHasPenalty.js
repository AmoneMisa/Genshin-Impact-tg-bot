module.exports = function (session) {
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