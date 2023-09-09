const getMaxHp = require("./getters/getMaxHp");
module.exports = function (session, skill) {
    let maxHp = getMaxHp(session, session.game.gameClass);
    let modifier = skill.shieldPower;
    let shield;

    shield = Math.ceil(maxHp * modifier);

    return shield;
};