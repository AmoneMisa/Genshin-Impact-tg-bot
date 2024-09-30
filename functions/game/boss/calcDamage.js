import getRandom from '../../getters/getRandom.js';
import getRandomWithoutFloor from '../../getters/getRandomWithoutFloor.js';
import getAttack from '../player/getters/getAttack.js';
import getBossDefence from './getBossStats/getBossDefence.js';
import getDamageMultiplier from '../player/getters/getDamageMultiplier.js';
import getCriticalChance from '../player/getters/getCriticalChance.js';
import getCriticalChanceMultiplier from '../player/getters/getCriticalChanceMultiplier.js';
import getCriticalDamage from '../player/getters/getCriticalDamage.js';
import getAdditionalDamageMul from '../player/getters/getAdditionalDamageMul.js';
import getCriticalDamageMultiplier from '../player/getters/getCriticalDamageMultiplier.js';
import bossesTemplate from '../../../template/bossTemplate.js';
import getEquipStatByName from '../player/getters/getEquipStatByName.js';

export default function (session, skill, boss) {
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

    let attack = getAttack(session, session.game.gameClass);
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