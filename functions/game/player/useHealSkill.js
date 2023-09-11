const getEquipStatByName = require("./getters/getEquipStatByName");
const getMaxHp = require("./getters/getMaxHp");

module.exports = function (session, skill) {
    let gameClass = session?.game?.gameClass || session?.gameClass;
    return Math.ceil(
        Math.min(getMaxHp(session, gameClass) * skill.healPower * getEquipStatByName(session, "healPowerMul", true),
            getMaxHp(session, gameClass)
        )
    );
};