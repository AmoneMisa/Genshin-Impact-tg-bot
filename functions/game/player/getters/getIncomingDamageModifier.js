import getPlayerGameClass from './getPlayerGameClass.js';
import getEquipStatByName from './getEquipStatByName.js';

export default function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    return Math.min(1.8, stats.incomingDamageModifier * getEquipStatByName(session, "incomingDamageModifier", true));
};