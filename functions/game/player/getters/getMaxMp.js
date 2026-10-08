import getPlayerGameClass from './getPlayerGameClass.js';
import getEquipStatByName from './getEquipStatByName.js';

export default function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    // Gear adds a flat amount (maxMp) and a multiplier (maxMpMul) on top of the class value.
    return Math.round((stats.maxMp + getEquipStatByName(session, "maxMp"))
        * getEquipStatByName(session, "maxMpMul", true));
};