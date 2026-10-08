import levelsTemplate from '../../../template/levelsTemplate.js';
import updatePlayerStats from './updatePlayerStats.js';

// Skill points earned per level gained - spent enchanting skills (see skillEnchant.js) and,
// after the 3rd profession, enchant routes (skillRoutes.js). The reward grows with the level
// because the price of a skill's upgrades does: a flat 20 SP per level (~2 000 SP for all 99
// levels) could not even max the three base skills (3 300 SP). Levelling now yields about
// 9 300 SP in total (20 at level 1, 50 at level 21, 90 at level 47, 168 at level 99).
export function spForLevelUp(fromLevel) {
    return 20 + Math.floor(1.5 * (Math.max(1, fromLevel) - 1));
}

export default function (session) {
    for (let level of levelsTemplate) {
        if (level.lvl !== session.game.stats.lvl) {
            continue;
        }

        if (session.game.stats.currentExp >= level.needExp) {
            session.game.stats.currentExp -= level.needExp;
            session.game.inventory.sp = (session.game.inventory.sp || 0) + spForLevelUp(session.game.stats.lvl);
            session.game.stats.lvl++;

            if (session.game.hasOwnProperty("gameClass")) {
                updatePlayerStats(session);
            }

            continue;
        }

        session.game.stats.needExp = level.needExp - session.game.stats.currentExp;
    }
};