import getEquipStatByName from './getters/getEquipStatByName.js';
import getSpeed from './getters/getSpeed.js';
import { getSkillCooldownMultiplier } from './skillEnchant.js';
import { hasteReduction } from './skillEffects.js';

export const MIN_COOLDOWN_SHARE = 0.35;

export default function (skill, session) {
    let speedMul = getSpeed(session, session.game.gameClass) / 97;
    let cooltime = skill.cooldown * 1000 * getSkillCooldownMultiplier(skill) * getEquipStatByName(session, "skillCooltimeMul", true) * (1 / speedMul) * (1 - hasteReduction(session));
    // Skill level, route, gear, speed and haste stack: never below a third of the base cooldown.
    cooltime = Math.max(cooltime, skill.cooldown * 1000 * MIN_COOLDOWN_SHARE);
    skill.cooldownReceive = new Date().getTime() + cooltime;
};
