const levelsTemplate = require('../../../template/levelsTemplate');
const updatePlayerStats = require('./updatePlayerStats');

module.exports = function (session) {
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
};