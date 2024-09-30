import getEquipStatByName from './getters/getEquipStatByName.js';
import getMaxHp from './getters/getMaxHp.js';

export default function (session, skill) {
    let gameClass = session?.game?.gameClass || session?.gameClass;
    return Math.ceil(
        Math.min(getMaxHp(session, gameClass) * skill.healPower * getEquipStatByName(session, "healPowerMul", true),
            getMaxHp(session, gameClass)
        )
    );
};