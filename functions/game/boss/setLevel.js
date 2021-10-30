const levelsTemplate = require('../../../templates/levelsTemplate');
const setPlayerStats = require('../../game/player/setPlayerStats');

module.exports = function (session) {
    for (let level of levelsTemplate) {
        if (level.lvl === session.game.stats.lvl) {
            if (session.game.stats.currentExp >= level.needExp) {
                session.game.stats.currentExp -= level.needExp;
                session.game.stats.lvl++;
                session.game.inventory.gold += Math.ceil( 1000 * session.game.stats.lvl * 1.33);
                session.game.boss.hp = Math.ceil(1000 * session.game.stats.lvl * 1.05) + 125;

                if (session.game.hasOwnProperty("gameClass")) {
                    setPlayerStats(session);
                }

                continue;
            }

            session.game.stats.needExp = level.needExp - session.game.stats.currentExp;
        }
    }
};