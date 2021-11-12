const setSkillCooltime = require('./setSkillCooltime');
const skillUsageCost = require('./skillUsageCost');

module.exports = function (session, skill) {
    if (skill.slot === 0) {
        return {isCanBeUsed: true};
    }

    if (setSkillCooltime(skill)) {
        if (skillUsageCost(session, skill)) {
            return {isCanBeUsed: true};
        } else {
            return {isCanBeUsed: false, message: "Недостаточно средств для использования скилла."};
        }
    } else {
        return {isCanBeUsed: false, message: "Скилл в кд."};
    }
};