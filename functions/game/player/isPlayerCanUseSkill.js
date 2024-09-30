import getSkillCooldown from './getters/getSkillCooldown.js';
import isEnoughResourcesForUseSkill from './isEnoughResourcesForUseSkill.js';

export default function (session, skill) {
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