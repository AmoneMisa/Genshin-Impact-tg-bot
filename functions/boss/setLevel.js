const levelsTemplate = require('../../templates/levelsTemplate');

module.exports = function (session) {
    for (let level of levelsTemplate) {
        if (level.lvl === session.game.stats.lvl) {
            if (session.game.stats.currentExp >= level.needExp) {
                session.game.stats.currentExp -= level.needExp;
                session.game.stats.lvl++;
                session.game.inventory.gold += ( 1000 * session.game.stats.lvl / 0.33);
                session.game.boss.hp = (1000 * session.game.stats.lvl) / 0.3 + 125;
                continue;
            }

            session.game.stats.needExp = level.needExp - session.game.stats.currentExp;
        }
    }
};