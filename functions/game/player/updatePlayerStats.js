const getClassStatsFromTemplate = require('./getGameClassStatsFromTemplate');

module.exports = function (session) {
    let className = session?.game?.gameClass?.stats?.name || "noClass";
    let template = getClassStatsFromTemplate(className);

    session.game.gameClass.stats.attack = Math.ceil(template.attack * Math.pow(1.105, session.game.stats.lvl - 1) + 8);
    session.game.gameClass.stats.defence = Math.ceil(template.defence * Math.pow(1.102, session.game.stats.lvl - 1) + 6);
    session.game.gameClass.stats.hp = Math.ceil(template.maxHp * session.game.stats.lvl * 1.036) + 45;
    session.game.gameClass.stats.maxHp = Math.ceil(template.maxHp * session.game.stats.lvl * 1.036) + 45;
    session.game.gameClass.stats.mp = Math.ceil(template.maxMp * session.game.stats.lvl * 1.0375) + 25;
    session.game.gameClass.stats.maxMp = Math.ceil(template.maxMp * session.game.stats.lvl * 1.0375) + 25;
    session.game.gameClass.stats.criticalDamage = template.criticalDamage;
    session.game.gameClass.stats.criticalChance = template.criticalChance;
};