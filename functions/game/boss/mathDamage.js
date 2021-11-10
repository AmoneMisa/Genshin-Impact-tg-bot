const getRandom = require('../../getRandom');
const getAttack = require('../../game/player/getAttack');
const getDamageMultiplier = require('../../game/player/getDamageMultiplier');

module.exports = function (session, skill) {
    let stats = session.game.gameClass.stats;
    let dmg;
    let modificator = skill.damageModificator || 1;

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

    let attack = getAttack(session);
    let damageMultiplier = getDamageMultiplier(session);

    for (let effect of session.game.effects) {
        if (effect.count) {
            effect.count--;
        }
    }

    session.game.effects = session.game.effects.filter(effect => !effect.hasOwnProperty("count") || effect.count > 0);

    dmg = Math.ceil(getRandom(200, 350) * (Math.pow(1.05, attack) / Math.pow(1.03, stats.deffence)) * modificator);
    dmg *= damageMultiplier;

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

    return {dmg, isHasCritical};
};