import getPlayerGameClass from './getPlayerGameClass.js';
import getEquipStatByName from './getEquipStatByName.js';
import {combatType} from '../combatType.js';

export default function (session, gameClass, damageType) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    const type = combatType(gameClass, damageType);
    const base = stats[type === 'magic' ? 'mAtk' : 'pAtk'] ?? stats.attack;

    let totalValue = Math.round(
        (base * getEquipStatByName(session, "power", true, type))
        * getEquipStatByName(session, "attackMul", true, type)
        + getEquipStatByName(session, "attack", false, type));

    return totalValue;
};
