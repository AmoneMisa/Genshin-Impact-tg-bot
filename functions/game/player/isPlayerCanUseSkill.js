import getSkillCooldown from './getters/getSkillCooldown.js';
import isEnoughResourcesForUseSkill from './isEnoughResourcesForUseSkill.js';
import {hasAmmo} from '../shots/ammo.js';
import {l2ActionBlock} from './l2Effects.js';
import {skillCombatType} from './combatType.js';
import {isSkillLearned} from './skillLearning.js';

// 0 - can be used; 1 - not enough mp/hp; 2 - on cooldown; 3 - the player's level is too low or the skill is not learned
// yet (skillLearning.js); 4 - no arrows / bolts.
export default function (session, skill, now=Date.now()) {
    if(l2ActionBlock(session,{magic:skillCombatType(skill,session?.game?.gameClass)==='magic',attack:Boolean(skill?.isDealDamage)},now))return 5;
    // turned to stone by a raid boss (worldBosses.js): nothing can be done until it wears off
    if ((Number(session?.game?.petrifiedUntil) || 0) > now) return 5;
    if ((Number(skill?.needLvl) || 0) > (Number(session?.game?.stats?.lvl) || 1)) {
        return 3;
    }
    if (!isSkillLearned(session, skill)) return 3;

    let enoughCostForUsage = isEnoughResourcesForUseSkill(session, skill);

    if (!enoughCostForUsage) {
        return 1;
    }

    let cooldown = getSkillCooldown(skill);

    if (cooldown > now) {
        return 2;
    }

    if (!hasAmmo(session, skill)) {
        return 4;
    }

    return 0;
};
