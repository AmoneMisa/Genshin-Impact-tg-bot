import getPlayerGameClass from './getPlayerGameClass.js';
import getMaxMp from './getMaxMp.js';

export default function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    return Math.min( Math.round(stats.mp), getMaxMp(session, gameClass));
};