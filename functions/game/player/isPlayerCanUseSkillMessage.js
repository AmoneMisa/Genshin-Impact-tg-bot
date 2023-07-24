const getSkillCooltime = require("./getSkillCooltime");

module.exports = function (errorCode, skill) {
    if (errorCode === 1) {
        return "Недостаточно средств для использования скилла.";
    }

    let cooltime = getSkillCooltime(skill);

    if (errorCode === 2) {
        return `Скилл в кд. Осталось ${cooltime} ударов.`;
    }
}