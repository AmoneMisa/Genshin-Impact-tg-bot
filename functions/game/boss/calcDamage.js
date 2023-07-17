const getRandom = require('../../getters/getRandom');
const getAttack = require('../../game/player/getAttack');
const getBossDefence = require('../../game/boss/getBossDefence');
const getDamageMultiplier = require('../../game/player/getDamageMultiplier');
const getCriticalChance = require('../player/geCriticalChance');
const getCriticalChanceMultiplier = require('../player/getCriticalChanceMultiplier');
const getCriticalDamage = require('../player/geCriticalDamage');
const getCriticalDamageMultiplier = require('../player/getCriticalDamageMultiplier');

module.exports = function (session, skill, boss) {
    let dmg;
    let modifier = skill.damageModificator || 1;

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
    let bossDefence = getBossDefence(boss);

    dmg = Math.ceil(getRandom(270, 400) * (Math.pow(1.05, attack) / Math.pow(1.03, bossDefence)) * modifier);
    dmg *= damageMultiplier;

    if (getRandom(1, 100) <= criticalChance) {
        isHasCritical = true;
        dmg *= criticalDamage;
    }

    session.game.effects = session.game.effects.filter(effect => !effect.hasOwnProperty("count") || effect.count > 0);

    for (let effect of session.game.effects) {
        if (effect.count) {
            effect.count--;
        }
    }

    dmg = Math.ceil(dmg);

    return {dmg, isHasCritical};
};