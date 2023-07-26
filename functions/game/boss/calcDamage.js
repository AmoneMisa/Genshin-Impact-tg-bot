const getRandom = require('../../getters/getRandom');
const getAttack = require('../../game/player/getAttack');
const getBossDefence = require('./getBossStats/getBossDefence');
const getDamageMultiplier = require('../../game/player/getDamageMultiplier');
const getCriticalChance = require('../player/geCriticalChance');
const getCriticalChanceMultiplier = require('../player/getCriticalChanceMultiplier');
const getCriticalDamage = require('../player/geCriticalDamage');
const getCriticalDamageMultiplier = require('../player/getCriticalDamageMultiplier');
const bossesTemplate = require("../../../templates/bossTemplate");

module.exports = function (session, skill, boss) {
    let dmg;
    let template = bossesTemplate.find(bossTemplate => bossTemplate.name === boss.name);
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

    let attack = getAttack(session.game.gameClass);
    let damageMultiplier = getDamageMultiplier(session.game.effects);
    let bossDefence = getBossDefence(boss, template);
    let additionalDamage = (session.game.gameClass.stats.additionalDamage / 100) + 1;

    dmg = getRandom(270, 480) * attack / bossDefence * modifier * additionalDamage;

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