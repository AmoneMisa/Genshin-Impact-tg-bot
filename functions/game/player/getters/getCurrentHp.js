import getPlayerGameClass from './getPlayerGameClass.js';
import getMaxHp from './getMaxHp.js';
export default function (session, gameClass) {
    if (!gameClass) {
        gameClass = session.game.gameClass;
    }

    let {stats} = getPlayerGameClass(gameClass);
    return Math.min(Math.round(stats.hp), getMaxHp(session, gameClass));
};