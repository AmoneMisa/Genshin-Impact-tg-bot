const getSkillCooldown = require('./getters/getSkillCooldown');
const isEnoughResourcesForUseSkill = require('./isEnoughResourcesForUseSkill');

module.exports = function (session, skill) {
    let enoughCostForUsage = isEnoughResourcesForUseSkill(session, skill);

    if (!enoughCostForUsage) {
        return 1;
    }

    let cooldown = getSkillCooldown(skill);

    if (cooldown > new Date().getTime()) {
        return 2;
    }

    return 0;
};