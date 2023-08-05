const getPlayerGameClass = require("./getPlayerGameClass");
const getEquipStatByName = require("../../../functions/game/player/getEquipStatByName");

module.exports = function (gameClass, session) {
    let {stats} = getPlayerGameClass(gameClass);
    return (stats.reduceIncomingDamage + getEquipStatByName(session, "reduceIncomingDamage")).toFixed(2);
};