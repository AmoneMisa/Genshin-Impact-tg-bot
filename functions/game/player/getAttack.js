const getPlayerGameClass = require("./getPlayerGameClass");
const getEquipStatByName = require("./getEquipStatByName");

module.exports = function (gameClass, session) {
    let {stats} = getPlayerGameClass(gameClass);
    return Math.round((stats.attack + getEquipStatByName(session, "attack")) * getEquipStatByName(session, "power"));
};