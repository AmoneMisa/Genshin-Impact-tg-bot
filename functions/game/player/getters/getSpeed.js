import getPlayerGameClass from './getPlayerGameClass.js';
import getEquipStatByName from './getEquipStatByName.js';

export default function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    let totalValue = Math.min(225, (stats.speed + getEquipStatByName(session, "speed")) * getEquipStatByName(session,"speedMul",true));

    return totalValue;
};
