const getPlayerGameClass = require("./getPlayerGameClass");
const getEquipStatByName = require("./getEquipStatByName");

module.exports = function (gameClass, session) {
    let {stats} = getPlayerGameClass(gameClass);
    return Math.round(stats.maxHp * (1 + getEquipStatByName(session, "maxHp")));
};