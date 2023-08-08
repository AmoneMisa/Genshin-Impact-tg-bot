const getCurrentMp = require("./getters/getCurrentMp");
const getCurrentHp = require("./getters/getCurrentHp");

module.exports = function (session, skill) {
    let userMp = getCurrentMp(session, session.game.gameClass);
    let userHp = getCurrentHp(session, session.game.gameClass);

    if (skill.cost && skill.cost <= userMp && !skill.costHp) {
        return true;
    } else if (skill.costHp && skill.costHp <= userHp) {
        return true;
    }

    return false;
};