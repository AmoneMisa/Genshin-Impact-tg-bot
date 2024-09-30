import getPlayerGameClass from './getPlayerGameClass.js';
import getMaxCp from './getMaxCp.js';

export default function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    return Math.min(Math.round(stats.cp), getMaxCp(session, gameClass));
};