import levelsTemplate from '../../../template/levelsTemplate.js';
import updatePlayerStats from './updatePlayerStats.js';
import {playerLevelCap} from './classProgression.js';

/** Characters above the level cap (it used to be 99) drop to it. */
export function clampLevel(session) {
    const stats = session?.game?.stats;
    if (!stats || !(stats.lvl > playerLevelCap(session))) return false;
    stats.lvl = playerLevelCap(session);
    stats.currentExp = 0;
    if (session.game.hasOwnProperty("gameClass")) updatePlayerStats(session);
    return true;
}

export default function (session) {
    clampLevel(session);
    const cap=playerLevelCap(session);
    for (let level of levelsTemplate) {
        if(session.game.stats.lvl>=cap)break;
        if (level.lvl !== session.game.stats.lvl) {
            continue;
        }

        if (session.game.stats.currentExp >= level.needExp) {
            session.game.stats.currentExp -= level.needExp;
            session.game.stats.lvl++;

            if (session.game.hasOwnProperty("gameClass")) {
                updatePlayerStats(session);
            }

            continue;
        }

        session.game.stats.needExp = level.needExp - session.game.stats.currentExp;
    }

    // The last level has no experience left to earn.
    if (session.game.stats.lvl >= cap) {
        session.game.stats.currentExp = 0;
        session.game.stats.needExp = 0;
    }
};
