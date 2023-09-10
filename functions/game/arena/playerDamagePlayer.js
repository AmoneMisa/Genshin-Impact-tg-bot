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

module.exports = function (attacker, defender, defenderIsBot = false, attackerIsBot = false) {
    let defenderObj;

    if (defenderIsBot) {
        defenderObj = {
            className: defender.gameClass.name,
            lvl: defender.stats.lvl,
            effects: null,
            randomWeaponDamage: getEquipStatByName(defender, "randomDamage"),
            hp: getCurrentHp(defender, defender.gameClass),
            maxHp: getMaxHp(defender, defender.gameClass),
            cp: getMaxCp(defender, defender.gameClass),
            maxCp: getMaxCp(defender, defender.gameClass),
            maxMp: getMaxMp(defender, defender.gameClass),
            mpRestoreSpeed: getMpRestoreSpeed(defender, defender.gameClass),
            hpRestoreSpeed: getHpRestoreSpeed(defender, defender.gameClass),
            cpRestoreSpeed: getCpRestoreSpeed(defender, defender.gameClass),
            skills: defender.gameClass.skills.sort(compareSkills).reverse(),
            evasion: getEvasion(defender, defender.gameClass),
            block: getBlock(defender, defender.gameClass),
            accuracy: getAccuracy(defender, defender.gameClass),
            criticalChance: Math.min(getCriticalChance(defender, defender.gameClass) + getCriticalChanceMultiplier(defender), 100),
            criticalDamage: getCriticalDamage(defender, defender.gameClass) * getCriticalDamageMultiplier(defender),
            attack: getAttack(defender, defender.gameClass),
            damageMultiplier: 1,
            defence: getDefence(defender, defender.gameClass),
            additionalDamageMul: getAdditionalDamageMul(defender, defender.gameClass),
            incomingDamageModifier: getIncomingDamageModifier(defender, defender.gameClass)
        };
    } else {
        defenderObj = {
            className: defender.game.gameClass.name,
            lvl: defender.game.stats.lvl,
            effects: defender.game.effects,
            randomWeaponDamage: getEquipStatByName(defender, "randomDamage"),
            hp: getCurrentHp(defender, defender.game.gameClass),
            maxHp: getMaxHp(defender, defender.game.gameClass),
            cp: getMaxCp(defender, defender.game.gameClass),
            maxCp: getMaxCp(defender, defender.game.gameClass),
            maxMp: getMaxMp(defender, defender.game.gameClass),
            mpRestoreSpeed: getMpRestoreSpeed(defender, defender.game.gameClass),
            hpRestoreSpeed: getHpRestoreSpeed(defender, defender.game.gameClass),
            cpRestoreSpeed: getCpRestoreSpeed(defender, defender.game.gameClass),
            skills: defender.game.gameClass.skills.sort(compareSkills).reverse(),
            evasion: getEvasion(defender, defender.game.gameClass),
            block: getBlock(defender, defender.game.gameClass),
            accuracy: getAccuracy(defender, defender.game.gameClass),
            criticalChance: Math.min(getCriticalChance(defender, defender.game.gameClass) + getCriticalChanceMultiplier(defender), 100),
            criticalDamage: getCriticalDamage(defender, defender.game.gameClass) * getCriticalDamageMultiplier(defender),
            attack: getAttack(defender, defender.game.gameClass),
            damageMultiplier: getDamageMultiplier(defender.game.effects),
            defence: getDefence(defender, defender.game.gameClass),
            additionalDamageMul: getAdditionalDamageMul(defender, defender.game.gameClass),
            incomingDamageModifier: getIncomingDamageModifier(defender, defender.game.gameClass)
        };
    }

    defenderObj.cooldowns = defenderObj.skills.map(_ => 0);

    let attackerObj;

    if (attackerIsBot) {
        attackerObj = {
            className: attacker.gameClass.name,
            lvl: attacker.stats.lvl,
            effects: null,
            randomWeaponDamage: getEquipStatByName(attacker, "randomDamage"),
            hp: getCurrentHp(attacker, attacker.gameClass),
            maxHp: getMaxHp(attacker, attacker.gameClass),
            cp: getMaxCp(attacker, attacker.gameClass),
            maxCp: getMaxCp(attacker, attacker.gameClass),
            maxMp: getMaxMp(attacker, attacker.gameClass),
            mpRestoreSpeed: getMpRestoreSpeed(attacker, attacker.gameClass),
            hpRestoreSpeed: getHpRestoreSpeed(attacker, attacker.gameClass),
            cpRestoreSpeed: getCpRestoreSpeed(attacker, attacker.gameClass),
            skills: attacker.gameClass.skills.sort(compareSkills).reverse(),
            evasion: getEvasion(attacker, attacker.gameClass),
            block: getBlock(attacker, attacker.gameClass),
            accuracy: getAccuracy(attacker, attacker.gameClass),
            criticalChance: Math.min(getCriticalChance(attacker, attacker.gameClass) + getCriticalChanceMultiplier(attacker), 100),
            criticalDamage: getCriticalDamage(attacker, attacker.gameClass) * getCriticalDamageMultiplier(attacker),
            attack: getAttack(attacker, attacker.gameClass),
            damageMultiplier: 1,
            defence: getDefence(attacker, attacker.gameClass),
            additionalDamageMul: getAdditionalDamageMul(attacker, attacker.gameClass),
            incomingDamageModifier: getIncomingDamageModifier(attacker, attacker.gameClass)
        };
    } else {
        attackerObj = {
            className: attacker.game.gameClass.name,
            lvl: attacker.game.stats.lvl,
            effects: attacker.game.effects,
            randomWeaponDamage: getEquipStatByName(attacker, "randomDamage"),
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
            evasion: getEvasion(attacker, attacker.game.gameClass),
            block: getBlock(attacker, attacker.game.gameClass),
            accuracy: getAccuracy(attacker, attacker.game.gameClass),
            criticalChance: Math.min(getCriticalChance(attacker, attacker.game.gameClass) + getCriticalChanceMultiplier(attacker), 100),
            criticalDamage: getCriticalDamage(attacker, attacker.game.gameClass) * getCriticalDamageMultiplier(attacker),
            attack: getAttack(attacker, attacker.game.gameClass),
            damageMultiplier: getDamageMultiplier(attacker.game.effects),
            defence: getDefence(attacker, attacker.game.gameClass),
            additionalDamageMul: getAdditionalDamageMul(attacker, attacker.game.gameClass),
            incomingDamageModifier: getIncomingDamageModifier(attacker, attacker.game.gameClass)
        };
    }

    attackerObj.cooldowns = attackerObj.skills.map(_ => 0);

    // расчёт суммарного урона атакующего по противнику за 5 минут.
    for (let i = 0; i < 60 * 5; i++) {
        useSkills(defender, attackerObj, defenderObj);
        useSkills(attacker, defenderObj, attackerObj);

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

function calculateDamage(skill, attackerObj, defenderObj) {
    const isMagicClass = ['mage', 'priest'].includes(attackerObj.className);
    let damage = 1;
    let isHit = true;
    let isBlocked = false;

    // Расчет попадания и уворота. Магические классы (на данный момент - маг, прист) всегда попадают скиллами, но могут увернуться.
    // Так же, если уровень защитника на 8 и более, выше, чем уровень нападающего, защитник всегда уклоняется.
    if (!isMagicClass || (defenderObj.lvl - attackerObj.lvl < 8)) {
        let diff = limit(
            attackerObj.accuracy - defenderObj.evasion,
            -25, 10
        );
        let i = diff + 25;
        let hitChance = chanceToHitTemplate[i] / 100;

        isHit = Math.random() < hitChance;
    }

    if (isHit) {
        damage = calcSkillDamage(skill, attackerObj, defenderObj);
        // Проверка на блок урона
        const blockRate = (defenderObj.block - 1) / (135 - 1);
        // Минимальный шанс заблокировать урон - 1.75%, максимальный - 65%.
        const blockChance = 0.0175 + (0.65 - 0.0175) * blockRate;

        isBlocked = Math.random() < blockChance;

        // Урон может быть уменьшен до 67% в зависимости от величины значения блока.
        if (isBlocked) {
            damage *= (1 - (blockRate * 0.67));
        }
    }

    // Добавляем в расчёт рандомный разброс от оружия
    let minDmg = 1 - attackerObj.randomWeaponDamage;
    let maxDmg = 1 + attackerObj.randomWeaponDamage;
    let rndDmg = getRandomWithoutFloor(minDmg, maxDmg);

    damage = Math.ceil(damage * rndDmg);

    return {
        damage,
        isHit,
        isBlocked,
    };
}

function calcSkillDamage(skill, attackerObj, defenderObj) {
    let dmg;
    let modifier = skill.damageModifier || 1;

    dmg = 70 * attackerObj.attack / defenderObj.defence * modifier * attackerObj.additionalDamageMul;
    dmg *= attackerObj.damageMultiplier;

    if (getRandom(1, 100) <= attackerObj.criticalChance) {
        dmg *= attackerObj.criticalDamage;
    }

    if (attackerObj.effects) {
        attackerObj.effects = attackerObj.effects.filter(effect => !effect.hasOwnProperty("count") || effect.count > 0);

        for (let effect of attackerObj.effects) {
            if (effect.count) {
                effect.count--;
            }
        }
    }

    dmg = dmg * attackerObj.incomingDamageModifier;
    dmg = Math.ceil(dmg);

    if (lodash.isNaN(dmg) || lodash.isUndefined(dmg)) {
        throw new Error(`Ошибка в подсчёте урона игрока против игрока: ${dmg}`);
    }

    return dmg;
}

function useSkills(defender, attackerObj, defenderObj) {
    for (let j = 0; j < attackerObj.skills.length; j++) {
        let skill = attackerObj.skills[j];
        if (attackerObj.cooldowns[j] <= 0 && attackerObj.hp >= skill.costHp && attackerObj.mp >= skill.cost) {
            let defenderCurrentHpPercent = defenderObj.hp / defenderObj.maxHp;

            if (!skill.isHeal && !skill.isShield) {
                // считаем урон только от скиллов isDamage = true
                let damage = calculateDamage(skill, attackerObj, defenderObj).damage;
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
                let shieldEffect = defenderObj.effects ? defenderObj.effects.find(effect => effect.name === "shield") : null;

                if (!shieldEffect) {
                    defenderObj.effects.push({name: "shield", value: shield, time: 0});
                } else {
                    shieldEffect.value = shield;
                }

            } else if (skill.isHeal && defenderCurrentHpPercent < 0.60) {
                defenderObj.hp = Math.max(defenderObj.maxHp, defenderObj.hp + useHealSkill(defender, skill));
            }

            attackerObj.cooldowns[j] = skill.cooldown;
            attackerObj.hp -= skill.costHp;
            attackerObj.mp -= skill.cost;

            break;
        }
    }
}