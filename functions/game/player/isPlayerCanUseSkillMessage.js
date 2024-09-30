import getSkillCooldown from './getters/getSkillCooldown.js';
import getStringRemainTime from '../../getters/getStringRemainTime.js';
import getTime from '../../getters/getTime.js';

export default function (errorCode, skill) {
    if (errorCode === 1) {
        return "Недостаточно маны или хп для использования скилла. /whoami";
    }

    let cooldown = getSkillCooldown(skill);
    let [remain] = getTime(cooldown);

    if (errorCode === 2) {
        return `Скилл в кд. Осталось ${getStringRemainTime(remain)}`;
    }
}