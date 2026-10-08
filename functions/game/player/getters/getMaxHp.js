import getPlayerGameClass from './getPlayerGameClass.js';
import getEquipStatByName from './getEquipStatByName.js';

export default function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    // Gear adds a flat amount (maxHp) and a multiplier (maxHpMul) on top of the class value.
    return Math.round((stats.maxHp + getEquipStatByName(session, "maxHp"))
        * getEquipStatByName(session, "maxHpMul", true));
};