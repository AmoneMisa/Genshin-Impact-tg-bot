import getCurrentMp from './getters/getCurrentMp.js';
import getCurrentHp from './getters/getCurrentHp.js';

export default function (session, skill) {
    let userMp = getCurrentMp(session, session.game.gameClass);
    let userHp = getCurrentHp(session, session.game.gameClass);

    if (skill.cost && skill.cost > userMp) {
        return false;
    }

    if (skill.costHp && skill.costHp > userHp) {
        return false;
    }

    return true;
};