module.exports = function (attacker, defender, skill) {
    const isMagicClass = ['mage', 'priest'].includes(attacker.gameClass.stats.name);
    let damage = 1;
    let isHit = true;
    let isBlocked = false;

    // Расчет попадания
    if (!isMagicClass || (defender.stats.lvl - attacker.stats.lvl < 8)) {
        const accuracyRate = (attacker.gameClass.stats.accuracy - 1) / (255 - 1);
        const evasionRate = (defender.gameClass.stats.evasion - 1) / (255 - 1);
        const hitChance = 0.25 + (0.98 - 0.25) * (accuracyRate - evasionRate);

        isHit = Math.random() < hitChance;
    }

    if (isHit) {
        damage = calculateSkillDamage(attacker, skill);

        // Проверка на блок урона
        const blockRate = (defender.gameClass.stats.block - 1) / (135 - 1);
        const blockChance = 0.0175 + (0.65 - 0.0175) * blockRate;

        isBlocked = Math.random() < blockChance;

        if (isBlocked) {
            damage *= (1 - (blockRate * 0.67));
        }
    }

    // Проверка на CP, затем HP
    if (defender.gameClass.stats.cp > 0) {
        defender.gameClass.stats.cp -= damage;
        if (defender.gameClass.stats.cp < 0) {
            defender.gameClass.stats.cp = 0;
        }
    } else {
        defender.gameClass.stats.hp -= damage;
        if (defender.gameClass.stats.hp < 0) {
            defender.gameClass.stats.hp = 0;
        }
    }

    return {
        damage,
        isHit,
        isBlocked,
    };
}

function calculateSkillDamage(attacker, skill) {
    let damage = attacker.gameClass.stats.attack;
    if (skill.isDealDamage) {
        damage *= skill.damageModificator || 1;
    }

    return damage;
}