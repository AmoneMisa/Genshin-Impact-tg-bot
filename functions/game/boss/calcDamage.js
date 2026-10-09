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
import { getSkillPowerMultiplier } from '../player/skillEnchant.js';
import { bossDebuffAmount } from './bossDebuffs.js';
import { getRouteBonus } from '../player/skillRoutes.js';
import { attackFactor, attributeProfile, normalizeElement } from '../equipment/attributes.js';
import { chanceSkillFactor, equippedChanceSkills } from '../equipment/lifestoneSkills.js';

/**
 * One hit of `skill` from `session` on the boss (or on a minion, via
 * `options.defence`). Options:
 *   consume  - spend one charge of the damage/crit buffs (a multi-hit skill
 *              consumes them only on its first hit)
 *   defence  - target defence override (minions)
 *   hpShare  - target's remaining hp share, for `executeBelow` skills
 *   now      - clock, for armor-break expiry
 */
export default function (session, skill, boss, options = {}) {
    const {consume = true, defence, hpShare = 1, now = Date.now()} = options;
    let dmg;
    let template = bossesTemplate.find(bossTemplate => bossTemplate.name === boss.name);
    let modifier = (skill.damageModifier || 1) * getSkillPowerMultiplier(skill);

    // Execute skills hit harder once the target is low.
    if (skill.executeBelow && hpShare <= skill.executeBelow) {
        modifier *= 1 + (skill.executeBonus || 0);
    }

    let criticalChanceMultiplier = getCriticalChanceMultiplier(session);
    let criticalChance = getCriticalChance(session) + criticalChanceMultiplier + (skill.critChanceBonus || 0) + getRouteBonus(skill).critBonus;

    if (criticalChance > 100) {
        criticalChance = 100;
    }

    let isHasCritical = false;

    let criticalDamage = getCriticalDamage(session);
    let criticalDamageMultiplier = getCriticalDamageMultiplier(session);
    criticalDamage *= criticalDamageMultiplier;

    let attack = getAttack(session, session.game.gameClass);
    let damageMultiplier = getDamageMultiplier(session.game.effects);
    let bossDefence = (defence ?? getBossDefence(boss, template)) * (1 - bossDebuffAmount(boss, 'armorBreak', now));
    let additionalDamageMul = (getAdditionalDamageMul(session) / 100) + 1;

    dmg = 70 * attack / bossDefence * modifier * additionalDamageMul;
    dmg *= damageMultiplier;
    // The weapon's element against the boss's (minions have none), and the chance skills of a Life Stone weapon.
    if (defence === undefined) dmg *= attackFactor(attributeProfile(session).attack, normalizeElement(template?.element));
    dmg *= chanceSkillFactor(equippedChanceSkills(session));

    if (getRandom(1, 100) <= criticalChance) {
        isHasCritical = true;
        dmg *= criticalDamage;
    }

    if (consume) {
        session.game.effects = session.game.effects.filter(effect => !effect.hasOwnProperty("count") || effect.count > 0);

        for (let effect of session.game.effects) {
            if (effect.count) {
                effect.count--;
            }
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
