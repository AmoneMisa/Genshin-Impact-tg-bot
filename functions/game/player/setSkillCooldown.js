const getEquipStatByName = require("./getters/getEquipStatByName");
const getSpeed = require("./getters/getSpeed");

module.exports = function (skill, session) {
    let speedMul = getSpeed(session, session.game.gameClass) / 97;
    let cooltime = skill.cooldown * 1000 * getEquipStatByName(session, "skillCooltimeMul", true) * (1 / speedMul) ;
    skill.cooldownReceive = new Date().getTime() + cooltime;
};