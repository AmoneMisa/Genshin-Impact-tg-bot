const getPlayerGameClass = require("./getPlayerGameClass");
const getEquipStatByName = require("./getEquipStatByName");

module.exports = function (gameClass, session) {
    let {stats} = getPlayerGameClass(gameClass);
    return (stats.reduceIncomingDamage + getEquipStatByName(session, "reduceIncomingDamage")).toFixed(2);
};