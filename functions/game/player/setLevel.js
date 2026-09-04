import levelsTemplate from '../../../template/levelsTemplate.js';
import updatePlayerStats from './updatePlayerStats.js';

// Skill points earned per level gained — spent enchanting skills (see skillEnchant.js).
const SP_PER_LEVEL = 20;

export default function (session) {
    for (let level of levelsTemplate) {
        if (level.lvl !== session.game.stats.lvl) {
            continue;
        }

        if (session.game.stats.currentExp >= level.needExp) {
            session.game.stats.currentExp -= level.needExp;
            session.game.stats.lvl++;
            session.game.inventory.sp = (session.game.inventory.sp || 0) + SP_PER_LEVEL;

            if (session.game.hasOwnProperty("gameClass")) {
                updatePlayerStats(session);
            }

            continue;
        }

        session.game.stats.needExp = level.needExp - session.game.stats.currentExp;
    }
};