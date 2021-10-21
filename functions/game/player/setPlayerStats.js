const getPlayerClass = require('./getGameClass');
const classStatsTemplate = require('../../../templates/classStatsTemplate');

function increaseStat(statName, stat, lvl, gameClassName) {
    let step = 0;
    stat = classStatsTemplate[gameClassName][statName];

    if (statName === "attack") {
        step = 2;
    }

    if (statName === "deffence") {
        step = 1.5;
    }

    for (let i of lvl) {
        stat += step;
    }
}

module.exports = function (session) {
    let gameClass = getPlayerClass(session.game.gameClass);
    let lvl = session.game.stats.lvl;

    for (let [key, value] of Object.entries(gameClass.stats)) {
        if (key === "attack" || key !== "deffence") {
            increaseStat(key, value, lvl, session.game.gameClass.name);
        }
    }
};