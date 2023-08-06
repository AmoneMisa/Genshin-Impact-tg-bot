const getPlayerGameClass = require("./getPlayerGameClass");
const getEquipStatByName = require("./getEquipStatByName");

module.exports = function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    return Math.round((stats.defence * getEquipStatByName(session, "defenceMul") * getEquipStatByName(session, "defencePower") + getEquipStatByName(session, "defence")));
};