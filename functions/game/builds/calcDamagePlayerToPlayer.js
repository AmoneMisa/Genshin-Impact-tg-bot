const getCriticalChanceMultiplier = require("../player/getCriticalChanceMultiplier");
const getCriticalChance = require("../player/getCriticalChance");
const getCriticalDamage = require("../player/getCriticalDamage");
const getCriticalDamageMultiplier = require("../player/getCriticalDamageMultiplier");
const getAttack = require("../player/getAttack");
const getAdditionalDamage = require("../player/getAdditionalDamage");
const getDefence = require("../player/getDefence");
const getReduceIncomingDamage = require("../player/getReduceIncomingDamage");
const getDamageMultiplier = require("../player/getDamageMultiplier");
const getRandom = require("../../getters/getRandom");
const limit = require("../../misc/limit");
const chanceToHitTemplate = require("../../../templates/chanceToHitTemplate");

module.exports = function (attacker, defender) {
    let skills = attacker.game.gameClass.skills;
    skills.sort(compareSkills).reverse();
    let cooldowns = skills.map(_ => 0);
    let defenderHp =  defender.game.gameClass.stats.maxHp;
    let defenderMaxHp =  defender.game.gameClass.stats.maxHp;
    let defenderCp = defender.game.gameClass.stats.maxCp;
    let defenderMaxCp = defender.game.gameClass.stats.maxCp;
    let attackerHp = attacker.game.gameClass.stats.hp;
    let attackerMaxMp = attacker.game.gameClass.stats.maxMp;
    let attackerMp = attacker.game.gameClass.stats.mp;
    let attackerMpRestoreSpeed = attacker.game.gameClass.stats.mpRestoreSpeed;
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
        defenderHp = Math.min(defenderMaxHp, defenderHp + defender.game.gameClass.stats.hpRestoreSpeed);
        defenderCp = Math.min(defenderMaxCp, defenderCp + defender.game.gameClass.stats.cpRestoreSpeed);
    }

    return defenderHp;
}

function compareSkills(skillA, skillB) {
    let damageModifierA = skillA.damageModifier || 0;
    let damageModifierB = skillB.damageModifier || 0;

    return damageModifierA -  damageModifierB;
}

function calculateDamage(attacker, defender, skill) {
    const isMagicClass = ['mage', 'priest'].includes(attacker.game.gameClass.stats.name);
    let damage = 1;
    let isHit = true;
    let isBlocked = false;

    // Расчет попадания и уворота. Магические классы (на данный момент - маг, прист) всегда попадают скиллами, но могут увернуться.
    // Так же, если уровень защитника на 8 и более, выше, чем уровень нападающего, защитник всегда уклоняется.
    if (!isMagicClass || (defender.game.stats.lvl - attacker.game.stats.lvl < 8)) {
        let diff =  limit(
            attacker.game.gameClass.stats.accuracy - defender.game.gameClass.stats.evasion,
            -25, 10
        );
        let i = diff + 25;
        let hitChance = chanceToHitTemplate[i] / 100;

        isHit = Math.random() < hitChance;
    }

    if (isHit) {
        damage = calcSkillDamage(attacker, defender, skill);
        // Проверка на блок урона
        const blockRate = (defender.game.gameClass.stats.block - 1) / (135 - 1);
        // Минимальный шанс заблокировать урон - 1.75%, максимальный - 65%.
        const blockChance = 0.0175 + (0.65 - 0.0175) * blockRate;

        isBlocked = Math.random() < blockChance;

        // Урон может быть уменьшен до 67% в зависимости от величины значения блока.
        if (isBlocked) {
            damage *= (1 - (blockRate * 0.67));
        }
    }

    return {
        damage,
        isHit,
        isBlocked,
    };
}

function calcSkillDamage(attacker, defender, skill) {
    let defenderGameClass= defender.game.gameClass;
    let attackerGameClass= attacker.game.gameClass;

    let dmg;
    let modifier = skill.damageModifier || 1;

    let criticalChanceMultiplier = getCriticalChanceMultiplier(attacker);
    let criticalChance = getCriticalChance(attackerGameClass, attacker) + criticalChanceMultiplier;

    if (criticalChance > 100) {
        criticalChance = 100;
    }

    let criticalDamage = getCriticalDamage(attackerGameClass, attacker);
    let criticalDamageMultiplier = getCriticalDamageMultiplier(attacker);
    criticalDamage *= criticalDamageMultiplier;

    let attack = getAttack(attackerGameClass, attacker);
    let damageMultiplier = getDamageMultiplier(attacker.game.effects);
    let defenderDefence = getDefence(defenderGameClass, defender);
    let additionalDamage = getAdditionalDamage(attackerGameClass, attacker) + 1;
    let reduceIncomingDamage = getReduceIncomingDamage(defenderGameClass, defender) + 1;

    dmg = getRandom(9, 70) * attack / defenderDefence * modifier * additionalDamage;
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

    dmg = dmg * reduceIncomingDamage;
    dmg = Math.ceil(dmg);

    return dmg;
}