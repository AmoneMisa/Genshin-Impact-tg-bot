import getCurrentMp from './getters/getCurrentMp.js';
import getCurrentHp from './getters/getCurrentHp.js';
import { getEffectiveSkillCost } from './skillEnchant.js';

export default function (session, skill) {
    let userMp = getCurrentMp(session, session.game.gameClass);
    let userHp = getCurrentHp(session, session.game.gameClass);
    let { cost, costHp } = getEffectiveSkillCost(skill);

    if (cost && cost > userMp) {
        return false;
    }

    if (costHp && costHp > userHp) {
        return false;
    }

    return true;
};