const getSkillCooltime = require('./getSkillCooltime');
const skillUsageCost = require('./skillUsageCost');

module.exports = function (session, skill) {
    if (skill.slot === 0) {
        return true;
    }

    let enoughCostForUsage = skillUsageCost(session, skill);

    if (!enoughCostForUsage) {
        return 1;
    }

    let cooltime = getSkillCooltime(skill);

    if (cooltime > 0) {
        return 2;
    }

    return true;
};