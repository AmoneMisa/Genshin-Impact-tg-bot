import levelsTemplate, { MAX_LEVEL } from '../../../template/levelsTemplate.js';
import updatePlayerStats from './updatePlayerStats.js';

// High Five awards SP for kills and quests, not for crossing a level boundary.
export function spForLevelUp() { return 0; }

/** Characters above the level cap (it used to be 99) drop to it. */
export function clampLevel(session) {
    const stats = session?.game?.stats;
    if (!stats || !(stats.lvl > MAX_LEVEL)) return false;
    stats.lvl = MAX_LEVEL;
    stats.currentExp = 0;
    if (session.game.hasOwnProperty("gameClass")) updatePlayerStats(session);
    return true;
}

export default function (session) {
    clampLevel(session);
    for (let level of levelsTemplate) {
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
    if (session.game.stats.lvl >= MAX_LEVEL) {
        session.game.stats.currentExp = 0;
        session.game.stats.needExp = 0;
    }
};