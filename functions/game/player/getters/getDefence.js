const getPlayerGameClass = require("./getPlayerGameClass");
const getEquipStatByName = require("./getEquipStatByName");
const isHasPenalty = require("../../equipment/isHasPenalty");

module.exports = function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    let totalValue = Math.round((stats.defence * getEquipStatByName(session, "defenceMul", true)
        * getEquipStatByName(session, "defencePower", true)
        + getEquipStatByName(session, "defence")));

    if (isHasPenalty(session)) {
        totalValue *= 0.45;
    }

    return totalValue;
};