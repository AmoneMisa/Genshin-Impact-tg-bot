import getMaxHp from './getters/getMaxHp.js';
import { getSkillPowerMultiplier } from './skillEnchant.js';

export default function (session, skill) {
    let maxHp = getMaxHp(session, session.game.gameClass);
    let modifier = skill.shieldPower * getSkillPowerMultiplier(skill);
    let shield;

    shield = Math.ceil(maxHp * modifier);

    return shield;
};