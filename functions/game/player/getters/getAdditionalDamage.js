const getPlayerGameClass = require("./getPlayerGameClass");
const getEquipStatByName = require("./getEquipStatByName");

module.exports = function (gameClass, session) {
    let {stats} = getPlayerGameClass(gameClass);
    return (stats.additionalDamage + getEquipStatByName(session, "additionalDamage")).toFixed(2);
};