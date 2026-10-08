import getPlayerGameClass from './getPlayerGameClass.js';
import getEquipStatByName from './getEquipStatByName.js';

export const MIN_INCOMING_DAMAGE_MODIFIER = 0.55;

export default function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    // Floor: class modifiers and ten pieces of gear used to stack without limit, which, on top of
    // defence (-50%) and a guard (-80%), left a tank taking ~5% of a hit.
    return Math.max(MIN_INCOMING_DAMAGE_MODIFIER, Math.min(1.8, stats.incomingDamageModifier * getEquipStatByName(session, "incomingDamageModifier", true)));
};