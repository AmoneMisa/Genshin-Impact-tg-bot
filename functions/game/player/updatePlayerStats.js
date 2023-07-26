const getClassStatsFromTemplate = require('./getGameClassStatsFromTemplate');

module.exports = function (session) {
    let template = getClassStatsFromTemplate(session.game.gameClass.stats.name);

    session.game.gameClass.stats.attack = Math.ceil(template.attack * Math.pow(1.055, session.game.stats.lvl - 1));
    session.game.gameClass.stats.defence = Math.ceil(template.defence * Math.pow(1.035, session.game.stats.lvl - 1));
    session.game.gameClass.stats.hp = Math.ceil(template.maxHp * session.game.stats.lvl * 1.05) + 125;
    session.game.gameClass.stats.maxHp = Math.ceil(template.maxHp * session.game.stats.lvl * 1.05) + 125;
    session.game.gameClass.stats.mp = Math.ceil(template.maxMp * session.game.stats.lvl * 1.0375) + 65;
    session.game.gameClass.stats.maxMp = Math.ceil(template.maxMp * session.game.stats.lvl * 1.0375) + 65;
};