import getCurrentMp from './getters/getCurrentMp.js';
import getCurrentHp from './getters/getCurrentHp.js';
import getMaxHp from './getters/getMaxHp.js';
import { getEffectiveSkillCost } from './skillEnchant.js';

export default function (session, skill) {
    let userMp = getCurrentMp(session, session.game.gameClass);
    let userHp = getCurrentHp(session, session.game.gameClass);
    let { cost, costHp } = getEffectiveSkillCost(skill, getMaxHp(session, session.game.gameClass));

    if (cost && cost > userMp) {
        return false;
    }

    // Paying in health must never kill the caster.
    if (costHp && costHp >= userHp) {
        return false;
    }

    return true;
};
