import getSkillCooldown from './getters/getSkillCooldown.js';
import isEnoughResourcesForUseSkill from './isEnoughResourcesForUseSkill.js';

// 0 - can be used; 1 - not enough mp/hp; 2 - on cooldown; 3 - the player's level is too low.
export default function (session, skill) {
    if ((Number(skill?.needLvl) || 0) > (Number(session?.game?.stats?.lvl) || 1)) {
        return 3;
    }

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
