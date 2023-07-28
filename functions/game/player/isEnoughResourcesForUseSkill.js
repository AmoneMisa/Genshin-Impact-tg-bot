const getCurrentMp = require("./getCurrentMp");
const getCurrentHp = require("./getCurrentHp");

module.exports = function (session, skill) {
    let userMp = getCurrentMp(session.game.gameClass);
    let userHp = getCurrentHp(session.game.gameClass);

    if (skill.cost && skill.cost <= userMp && !skill.costHp) {
        return true;
    } else if (skill.costHp && skill.costHp <= userHp) {
        return true;
    }

    return false;
};