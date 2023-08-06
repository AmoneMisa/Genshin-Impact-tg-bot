const getEquipStatByName = require("./getters/getEquipStatByName");
module.exports = function (skill, session) {
    skill.cooldownReceive = new Date().getTime() + (skill.cooldown * 1000 * getEquipStatByName(session, "skillCooltimeMul", true));
};