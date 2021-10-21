const getRandom = require('../../getRandom');

module.exports = function (session) {
    let stats = session.game.gameClass.stats;
    let dmg;

    let criticalChance = 15;

    let isHasCritical = false;
    let criticalDamageInc;

    if (!session.game.boss.bonus.criticalDamage) {
        criticalDamageInc = 1.5;
    } else {
        criticalDamageInc = 1.5 + 1.5;
        if (session.game.boss.attackCounter === 10) {
            delete session.game.boss.bonus.criticalDamage;
            session.game.boss.attackCounter = 0;
        }
    }

    if (stats.criticalDamage > 0) {
        criticalDamageInc += stats.criticalDamage;
    }

    if (!session.game.boss.bonus.damage) {
        dmg = Math.ceil(getRandom(200, 350) * (Math.pow(1.05, stats.attack) / Math.pow(1.03, stats.deffence)));
    } else {
        if (session.game.boss.attackCounter === 10) {
            delete session.game.boss.bonus.damage;
        }
        dmg = Math.ceil(getRandom(200, 350) * 1.75) * (Math.pow(1.05, stats.attack) / Math.pow(1.03, stats.deffence));
    }

    if (stats.criticalChance > 0) {
        criticalChance += stats.criticalChance;
    }

    if (!session.game.boss.bonus.criticalChance) {
        if (getRandom(1, 100) <= criticalChance) {
            isHasCritical = true;
            dmg *= criticalDamageInc;
        }
    } else {
        if (getRandom(1, 100) <= criticalChance + 50) {
            isHasCritical = true;
            dmg *= criticalDamageInc;
            if (session.game.boss.attackCounter === 10) {
                delete session.game.boss.bonus.criticalChance;
                session.game.boss.attackCounter = 0;
            }
        }
    }

    return  {dmg, isHasCritical};
};