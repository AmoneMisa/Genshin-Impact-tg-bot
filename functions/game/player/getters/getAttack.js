const getPlayerGameClass = require("./getPlayerGameClass");
const getEquipStatByName = require("./getEquipStatByName");

module.exports = function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    return Math.round((stats.attack * getEquipStatByName(session, "power", true)) * getEquipStatByName(session, "attackMul", true) + getEquipStatByName(session, "attack"));
};