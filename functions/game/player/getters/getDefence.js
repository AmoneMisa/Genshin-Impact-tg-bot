import getPlayerGameClass from './getPlayerGameClass.js';
import getEquipStatByName from './getEquipStatByName.js';
import {combatType} from '../combatType.js';

export default function (session, gameClass, damageType) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    const type = combatType(gameClass, damageType);
    const base = stats[type === 'magic' ? 'mDef' : 'pDef'] ?? stats.defence;
    let totalValue = Math.round((base * getEquipStatByName(session, "defenceMul", true, type)
        * getEquipStatByName(session, "defencePower", true, type)
        + getEquipStatByName(session, "defence", false, type)));

    return totalValue;
};
