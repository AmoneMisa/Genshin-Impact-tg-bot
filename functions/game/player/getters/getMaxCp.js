import getPlayerGameClass from './getPlayerGameClass.js';
import getEquipStatByName from './getEquipStatByName.js';

export default function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    // Gear adds a flat amount (maxCp) and a multiplier (maxCpMul) on top of the class value.
    return Math.round((stats.maxCp + getEquipStatByName(session, "maxCp"))
        * getEquipStatByName(session, "maxCpMul", true));
};