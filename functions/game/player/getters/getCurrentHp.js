import getPlayerGameClass from './getPlayerGameClass.js';
import getMaxHp from './getMaxHp.js';
import {settlePotionHealing} from '../potionHealing.js';
export default function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    const maxHp = getMaxHp(session, gameClass);
    if (gameClass === session?.game?.gameClass) settlePotionHealing(session,Date.now(),maxHp);
    let {stats} = getPlayerGameClass(gameClass);
    return Math.min(Math.round(stats.hp), maxHp);
};
