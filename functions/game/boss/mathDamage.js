const getRandom = require('../../getRandom');
const getAttack = require('../../game/player/getAttack');
const getDamageMultiplier = require('../../game/player/getDamageMultiplier');
const getCriticalChance = require('../player/geCriticalChance');
const getCriticalChanceMultiplier = require('../player/getCriticalChanceMultiplier');
const getCriticalDamage = require('../player/geCriticalDamage');
const getCriticalDamageMultiplier = require('../player/getCriticalDamageMultiplier');

module.exports = function (session, skill, bossDefence) {
    let dmg;
    let modificator = skill.damageModificator || 1;

    let criticalChanceMultiplier = getCriticalChanceMultiplier(session);
    let criticalChance = getCriticalChance(session) + criticalChanceMultiplier;

    if (criticalChance > 100) {
        criticalChance = 100;
    }

    let isHasCritical = false;

    let criticalDamage = getCriticalDamage(session);
    let criticalDamageMultiplier = getCriticalDamageMultiplier(session);
    criticalDamage *= criticalDamageMultiplier;

    let attack = getAttack(session);
    let damageMultiplier = getDamageMultiplier(session);

    session.game.effects = session.game.effects.filter(effect => !effect.hasOwnProperty("count") || effect.count > 0);

    dmg = Math.ceil(getRandom(250, 370) * (Math.pow(1.05, attack) / Math.pow(1.03, bossDefence)) * modificator);
    dmg *= damageMultiplier;


    if (getRandom(1, 100) <= criticalChance) {
        isHasCritical = true;
        dmg *= criticalDamage;
    }

    for (let effect of session.game.effects) {
        if (effect.count) {
            effect.count--;
        }
    }

    return {dmg, isHasCritical};
};