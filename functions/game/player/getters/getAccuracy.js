import getPlayerGameClass from './getPlayerGameClass.js';
import getEquipStatByName from './getEquipStatByName.js';
import isHasPenalty from '../../equipment/isHasPenalty.js';

export default function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    let totalValue = Math.min(255, stats.accuracy + getEquipStatByName(session, "accuracy"));

    if (isHasPenalty(session)) {
        totalValue *= 0.45;
    }

    return totalValue;
};