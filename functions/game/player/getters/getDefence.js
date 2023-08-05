const getPlayerGameClass = require("./getPlayerGameClass");
const getEquipStatByName = require("./getEquipStatByName");

module.exports = function (gameClass, session) {
    let {stats} = getPlayerGameClass(gameClass);
    return Math.round((stats.defence + getEquipStatByName(session, "defence")) * getEquipStatByName(session, "defencePower"));
};