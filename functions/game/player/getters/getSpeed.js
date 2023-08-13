const getPlayerGameClass = require("./getPlayerGameClass");
const getEquipStatByName = require("./getEquipStatByName");
const isHasPenalty = require("../../equipment/isHasPenalty");

module.exports = function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    let totalValue = Math.min(225, stats.speed + getEquipStatByName(session, "speed"));

    if (isHasPenalty(session)) {
        totalValue *= 0.45;
    }

    return totalValue;
};