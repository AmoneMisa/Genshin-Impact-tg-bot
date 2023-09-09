const getMaxHp = require("../player/getters/getMaxHp");
const getMaxCp = require("../player/getters/getMaxCp");
const getCurrentHp = require("../player/getters/getCurrentHp");
const getMaxMp = require("../player/getters/getMaxMp");
const getCurrentMp = require("../player/getters/getCurrentMp");
const getMpRestoreSpeed = require("../player/getters/getMpRestoreSpeed");
const getHpRestoreSpeed = require("../player/getters/getHpRestoreSpeed");
const getCpRestoreSpeed = require("../player/getters/getCpRestoreSpeed");
const limit = require("../../misc/limit");
const getAccuracy = require("../player/getters/getAccuracy");
const getEvasion = require("../player/getters/getEvasion");
const chanceToHitTemplate = require("../../../templates/chanceToHitTemplate");
const getBlock = require("../player/getters/getBlock");
const getEquipStatByName = require("../player/getters/getEquipStatByName");
const getRandomWithoutFloor = require("../../getters/getRandomWithoutFloor");
const getCriticalChanceMultiplier = require("../player/getters/getCriticalChanceMultiplier");
const getCriticalChance = require("../player/getters/getCriticalChance");
const getCriticalDamage = require("../player/getters/getCriticalDamage");
const getCriticalDamageMultiplier = require("../player/getters/getCriticalDamageMultiplier");
const getAttack = require("../player/getters/getAttack");
const getDamageMultiplier = require("../player/getters/getDamageMultiplier");
const getDefence = require("../player/getters/getDefence");
const getAdditionalDamageMul = require("../player/getters/getAdditionalDamageMul");
const getIncomingDamageModifier = require("../player/getters/getIncomingDamageModifier");
const useHealSkill = require("../player/useHealSkill");
const useShieldSkill = require("../player/useShieldSkill");
const getRandom = require("../../getters/getRandom");
const lodash = require("lodash");

module.exports = function (attacker, defender) {
    let defenderObj = {
        hp: getCurrentHp(defender, defender.game.gameClass),
        maxHp: getMaxHp(defender, defender.game.gameClass),
        cp: getMaxCp(defender, defender.game.gameClass),
        maxCp: getMaxCp(defender, defender.game.gameClass),
        maxMp: getMaxMp(defender, defender.game.gameClass),
        mpRestoreSpeed: getMpRestoreSpeed(defender, defender.game.gameClass),
        hpRestoreSpeed: getHpRestoreSpeed(defender, defender.game.gameClass),
        cpRestoreSpeed: getCpRestoreSpeed(defender, defender.game.gameClass),
        skills: defender.game.gameClass.skills.sort(compareSkills).reverse(),
    };

    defenderObj.cooldowns = defenderObj.skills.map(_ => 0);

    let attackerObj = {
        hp: getCurrentHp(attacker, attacker.game.gameClass),
        maxHp: getMaxHp(attacker, attacker.game.gameClass),
        cp: getMaxCp(attacker, attacker.game.gameClass),
        maxCp: getMaxCp(attacker, attacker.game.gameClass),
        mp: getCurrentMp(attacker, attacker.game.gameClass),
        maxMp: getMaxMp(attacker, attacker.game.gameClass),
        mpRestoreSpeed: getMpRestoreSpeed(attacker, attacker.game.gameClass),
        hpRestoreSpeed: getHpRestoreSpeed(attacker, attacker.game.gameClass),
        cpRestoreSpeed: getCpRestoreSpeed(attacker, attacker.game.gameClass),
        skills: attacker.game.gameClass.skills.sort(compareSkills).reverse(),
    };

    attackerObj.cooldowns = attackerObj.skills.map(_ => 0);

    // расчёт суммарного урона атакующего по противнику за 5 минут.
    for (let i = 0; i < 60 * 5; i++) {
        useSkills(attacker, defender, attackerObj, defenderObj);
        useSkills(defender, attacker, defenderObj, attackerObj);

        attackerObj.mp = Math.min(attackerObj.maxMp, attackerObj.mp + attackerObj.mpRestoreSpeed);
        attackerObj.cooldowns = attackerObj.cooldowns.map(cooldown => Math.max(0, cooldown - 1));
        attackerObj.hp = Math.min(attackerObj.maxHp, attackerObj.hp + attackerObj.hpRestoreSpeed);
        attackerObj.cp = Math.min(attackerObj.maxCp, attackerObj.cp + attackerObj.cpRestoreSpeed);

        defenderObj.mp = Math.min(defenderObj.maxMp, defenderObj.mp + defenderObj.mpRestoreSpeed);
        defenderObj.cooldowns = defenderObj.cooldowns.map(cooldown => Math.max(0, cooldown - 1));
        defenderObj.hp = Math.min(defenderObj.maxHp, defenderObj.hp + defenderObj.hpRestoreSpeed);
        defenderObj.cp = Math.min(defenderObj.maxCp, defenderObj.cp + defenderObj.cpRestoreSpeed);
    }

    return [attackerObj.hp, defenderObj.hp];
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

function useSkills(attacker, defender, attackerObj, defenderObj) {
    for (let j = 0; j < attackerObj.skills.length; j++) {
        let skill = attackerObj.skills[j];
        if (attackerObj.cooldowns[j] <= 0 && attackerObj.hp >= skill.costHp && attackerObj.mp >= skill.cost) {
            let defenderCurrentHpPercent = defenderObj.hp / defenderObj.maxHp;

            if (!skill.isHeal && !skill.isShield) {
                // считаем урон только от скиллов isDamage = true
                let damage = calculateDamage(attacker, defender, skill).damage;
                let damageCp = Math.min(defenderObj.cp, damage);
                defenderObj.cp -= damageCp;
                damage -= damageCp;
                let damageHp = Math.min(defenderObj.hp, damage);
                defenderObj.hp -= damageHp;
                damage -= damageHp;

                if (defenderObj.hp === 0) {
                    return 0;
                }
            } else if (skill.isShield && defenderCurrentHpPercent < 0.80) {
                let shield = useShieldSkill(defender, skill);
                let shieldEffect = defender.game.effects.find(effect => effect.name === "shield");

                if (!shieldEffect) {
                    defender.game.effects.push({name: "shield", value: shield, time: 0});
                } else {
                    shieldEffect.value = shield;
                }

            } else if (skill.isHeal && defenderCurrentHpPercent < 0.60) {
                defender.game.gameClass.stats.hp = Math.max(getMaxHp(defender, defender.game.gameClass), defender.game.gameClass.stats.hp + useHealSkill(defender, skill));
            }

            attackerObj.cooldowns[j] = skill.cooldown;
            attackerObj.hp -= skill.costHp;
            attackerObj.mp -= skill.cost;

            break;
        }
    }
}