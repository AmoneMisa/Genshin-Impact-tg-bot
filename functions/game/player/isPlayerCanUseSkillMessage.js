const getSkillCooldown = require("./getSkillCooldown");
const getStringRemainTime = require("../../getters/getStringRemainTime");
const getTime = require("../../getters/getTime");

module.exports = function (errorCode, skill) {
    if (errorCode === 1) {
        return "Недостаточно маны или хп для использования скилла. /whoami";
    }

    let cooldown = getSkillCooldown(skill);
    let [remain] = getTime(cooldown);

    if (errorCode === 2) {
        return `Скилл в кд. Осталось ${getStringRemainTime(remain)}`;
    }
}