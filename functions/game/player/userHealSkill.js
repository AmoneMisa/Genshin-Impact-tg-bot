const getEquipStatByName = require("./getters/getEquipStatByName");
const getMaxHp = require("./getters/getMaxHp");

module.exports = function (session, skill) {
    return Math.ceil(
        Math.min(getMaxHp(session, session.game.gameClass) * skill.healPower * getEquipStatByName(session, "healPowerMul", true),
            getMaxHp(session, session.game.gameClass)
        )
    );
};