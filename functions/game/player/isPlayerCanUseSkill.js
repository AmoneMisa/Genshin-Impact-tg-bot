const setSkillCooltime = require('./setSkillCooltime');
const skillUsageCost = require('./skillUsageCost');

module.exports = function (session, skill) {
    if (skill.slot === 0) {
        return {isCanBeUsed: true};
    }


    let enoughCostForUsage = skillUsageCost(session, skill);

    if (!enoughCostForUsage) {
        return {isCanBeUsed: false, message: "Недостаточно средств для использования скилла."};
    }

    let cooltime = setSkillCooltime(skill);

    if (cooltime > 0) {
        return {isCanBeUsed: false, message: `Скилл в кд. Осталось ${cooltime} ударов.`};
    }

    return {isCanBeUsed: true};
};