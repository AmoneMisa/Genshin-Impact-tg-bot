const getRandom = require('../../getters/getRandom');
const getRandomWithoutFloor = require('../../getters/getRandomWithoutFloor');
const getAttack = require('../player/getters/getAttack');
const getBossDefence = require('./getBossStats/getBossDefence');
const getDamageMultiplier = require('../player/getters/getDamageMultiplier');
const getCriticalChance = require('../player/getters/getCriticalChance');
const getCriticalChanceMultiplier = require('../player/getters/getCriticalChanceMultiplier');
const getCriticalDamage = require('../player/getters/getCriticalDamage');
const getAdditionalDamageMul = require('../player/getters/getAdditionalDamageMul');
const getCriticalDamageMultiplier = require('../player/getters/getCriticalDamageMultiplier');
const bossesTemplate = require("../../../templates/bossTemplate");
const getEquipStatByName = require("../player/getters/getEquipStatByName");

module.exports = function (session, skill, boss) {
    let dmg;
    let template = bossesTemplate.find(bossTemplate => bossTemplate.name === boss.name);
    let modifier = skill.damageModifier || 1;

    let criticalChanceMultiplier = getCriticalChanceMultiplier(session);
    let criticalChance = getCriticalChance(session) + criticalChanceMultiplier;

    if (criticalChance > 100) {
        criticalChance = 100;
    }

    let isHasCritical = false;

    let criticalDamage = getCriticalDamage(session);
    let criticalDamageMultiplier = getCriticalDamageMultiplier(session);
    criticalDamage *= criticalDamageMultiplier;

    let attack = getAttack(session.game.gameClass, session);
    let damageMultiplier = getDamageMultiplier(session.game.effects);
    let bossDefence = getBossDefence(boss, template);
    let additionalDamageMul = (getAdditionalDamageMul(session) / 100) + 1;

    dmg = 70 * attack / bossDefence * modifier * additionalDamageMul;
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

    // Добавляем в расчёт рандомный разброс от оружия
    let randomWeaponDamage = getEquipStatByName(session, "randomDamage");
    let minDmg = 1 - randomWeaponDamage;
    let maxDmg = 1 + randomWeaponDamage;
    let rndDmg = getRandomWithoutFloor(minDmg, maxDmg);
    dmg = Math.ceil(dmg * rndDmg);
    return {dmg, isHasCritical};
};