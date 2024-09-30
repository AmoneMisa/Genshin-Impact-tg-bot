import getCriticalChanceMultiplier from '../player/getters/getCriticalChanceMultiplier.js';
import getCriticalChance from '../player/getters/getCriticalChance.js';
import getCriticalDamage from '../player/getters/getCriticalDamage.js';
import getCriticalDamageMultiplier from '../player/getters/getCriticalDamageMultiplier.js';
import getAttack from '../player/getters/getAttack.js';
import getMaxHp from '../player/getters/getMaxHp.js';
import getCurrentHp from '../player/getters/getCurrentHp.js';
import getMaxCp from '../player/getters/getMaxCp.js';
import getMaxMp from '../player/getters/getMaxMp.js';
import getCurrentMp from '../player/getters/getCurrentMp.js';
import getAdditionalDamageMul from '../player/getters/getAdditionalDamageMul.js';
import getDefence from '../player/getters/getDefence.js';
import getAccuracy from '../player/getters/getAccuracy.js';
import getBlock from '../player/getters/getBlock.js';
import getEvasion from '../player/getters/getEvasion.js';
import getMpRestoreSpeed from '../player/getters/getMpRestoreSpeed.js';
import getHpRestoreSpeed from '../player/getters/getHpRestoreSpeed.js';
import getCpRestoreSpeed from '../player/getters/getCpRestoreSpeed.js';
import getIncomingDamageModifier from '../player/getters/getIncomingDamageModifier.js';
import getDamageMultiplier from '../player/getters/getDamageMultiplier.js';
import getRandom from '../../getters/getRandom.js';
import limit from '../../misc/limit.js';
import chanceToHitTemplate from '../../../template/chanceToHitTemplate.js';
import getEquipStatByName from '../player/getters/getEquipStatByName.js';
import getRandomWithoutFloor from '../../getters/getRandomWithoutFloor.js';
import lodash from 'lodash';

export default function (attacker, defender) {
    let skills = attacker.game.gameClass.skills;
    skills.sort(compareSkills).reverse();
    let cooldowns = skills.map(_ => 0);
    let defenderHp = getMaxHp(defender);
    let defenderMaxHp = getMaxHp(defender);
    let defenderCp = getMaxCp(defender);
    let defenderMaxCp = getMaxCp(defender);
    let attackerHp = getCurrentHp(attacker);
    let attackerMaxMp = getMaxMp(attacker);
    let attackerMp = getCurrentMp(attacker);
    let attackerMpRestoreSpeed = getMpRestoreSpeed(attacker);
    // расчёт суммарного урона атакующего по защитнику за 2 минуты.
    for (let i = 0; i < 120; i++) {
        for (let j = 0; j < skills.length; j++) {
            let skill = skills[j];
            if (cooldowns[j] <= 0 && attackerHp >= skill.costHp && attackerMp >= skill.cost) {
                if (!skill.isHeal && !skill.isShield) {
                    // считаем урон только от скиллов isDamage = true
                    let damage = calculateDamage(attacker, defender, skill).damage;
                    let damageCp = Math.min(defenderCp, damage);
                    defenderCp -= damageCp;
                    damage -= damageCp;
                    let damageHp = Math.min(defenderHp, damage);
                    defenderHp -= damageHp;
                    damage -= damageHp;

                    if (defenderHp === 0) {
                        return 0;
                    }
                }

                cooldowns[j] = skill.cooldown;
                attackerHp -= skill.costHp;
                attackerMp -= skill.cost;

                break;
            }
        }

        attackerMp = Math.min(attackerMaxMp, attackerMp + attackerMpRestoreSpeed);
        cooldowns = cooldowns.map(cooldown => Math.max(0, cooldown - 1));
        defenderHp = Math.min(defenderMaxHp, defenderHp + getHpRestoreSpeed(defender));
        defenderCp = Math.min(defenderMaxCp, defenderCp + getCpRestoreSpeed(defender));
    }

    return defenderHp;
}

function compareSkills(skillA, skillB) {
    let damageModifierA = skillA.damageModifier || 0;
    let damageModifierB = skillB.damageModifier || 0;

    return damageModifierA - damageModifierB;
}

function calculateDamage(attacker, defender, skill) {
    const isMagicClass = ['mage', 'priest'].includes(attacker.game.gameClass.stats.name);
    let damage = 1;
    let isHit = true;
    let isBlocked = false;

    // Расчет попадания и уворота. Магические классы (на данный момент - маг, прист) всегда попадают скиллами, но могут увернуться.
    // Так же, если уровень защитника на 8 и более, выше, чем уровень нападающего, защитник всегда уклоняется.
    if (!isMagicClass || (defender.game.stats.lvl - attacker.game.stats.lvl < 8)) {
        let diff = limit(
            getAccuracy(attacker) - getEvasion(defender),
            -25, 10
        );
        let i = diff + 25;
        let hitChance = chanceToHitTemplate[i] / 100;

        isHit = Math.random() < hitChance;
    }

    if (isHit) {
        damage = calcSkillDamage(attacker, defender, skill);
        // Проверка на блок урона
        const blockRate = (getBlock(defender) - 1) / (135 - 1);
        // Минимальный шанс заблокировать урон - 1.75%, максимальный - 65%.
        const blockChance = 0.0175 + (0.65 - 0.0175) * blockRate;

        isBlocked = Math.random() < blockChance;

        // Урон может быть уменьшен до 67% в зависимости от величины значения блока.
        if (isBlocked) {
            damage *= (1 - (blockRate * 0.67));
        }
    }

    // Добавляем в расчёт рандомный разброс от оружия
    let randomWeaponDamage = getEquipStatByName(attacker, "randomDamage");
    let minDmg = 1 - randomWeaponDamage;
    let maxDmg = 1 + randomWeaponDamage;
    let rndDmg = getRandomWithoutFloor(minDmg, maxDmg);

    damage = Math.ceil(damage * rndDmg);

    return {
        damage,
        isHit,
        isBlocked,
    };
}

function calcSkillDamage(attacker, defender, skill) {
    let defenderGameClass = defender.game.gameClass;
    let attackerGameClass = attacker.game.gameClass;

    let dmg;
    let modifier = skill.damageModifier || 1;

    let criticalChanceMultiplier = getCriticalChanceMultiplier(attacker);
    let criticalChance = getCriticalChance(attacker, attackerGameClass) + criticalChanceMultiplier;

    if (criticalChance > 100) {
        criticalChance = 100;
    }

    let criticalDamage = getCriticalDamage(attacker, attackerGameClass);
    let criticalDamageMultiplier = getCriticalDamageMultiplier(attacker);
    criticalDamage *= criticalDamageMultiplier;

    let attack = getAttack(attacker, attackerGameClass);
    let damageMultiplier = getDamageMultiplier(attacker.game.effects);
    let defenderDefence = getDefence(defender, defenderGameClass);
    let additionalDamageMul = getAdditionalDamageMul(attacker, attackerGameClass);
    let incomingDamageModifier = getIncomingDamageModifier(defender, defenderGameClass);

    dmg = 70 * attack / defenderDefence * modifier * additionalDamageMul;
    dmg *= damageMultiplier;

    if (getRandom(1, 100) <= criticalChance) {
        dmg *= criticalDamage;
    }

    attacker.game.effects = attacker.game.effects.filter(effect => !effect.hasOwnProperty("count") || effect.count > 0);

    for (let effect of attacker.game.effects) {
        if (effect.count) {
            effect.count--;
        }
    }

    dmg = dmg * incomingDamageModifier;
    dmg = Math.ceil(dmg);

    if (lodash.isNaN(dmg) || lodash.isUndefined(dmg)) {
        throw new Error(`Ошибка в подсчёте урона игрока против игрока: ${dmg}`);
    }

    return dmg;
}