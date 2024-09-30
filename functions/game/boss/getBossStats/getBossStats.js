import getBossAttack from './getBossAttack.js';
import getBossDefence from './getBossDefence.js';
import getBossMinDamage from './getBossMinDamage.js';
import getBossMaxDamage from './getBossMaxDamage.js';
import getBossCriticalChance from './getBossCriticalChance.js';
import getBossCriticalDamage from './getBossCriticalDamage.js';

export default function (boss, bossTemplate) {
    if (boss.skill.effect.includes("resistance")) {
        return {
            attack: getBossAttack(boss, bossTemplate, 1.4),
            defence: getBossDefence(boss, bossTemplate, 2),
            minDamage: getBossMinDamage(boss, bossTemplate),
            maxDamage: getBossMaxDamage(boss, bossTemplate),
            criticalChance: getBossCriticalChance(boss, bossTemplate),
            criticalDamage: getBossCriticalDamage(boss, bossTemplate)
        }
    }

    if (boss.skill.effect.includes("life")) {
        return {
            attack: getBossAttack(boss, bossTemplate, 2),
            defence: getBossDefence(boss, bossTemplate, 2),
            minDamage: getBossMinDamage(boss, bossTemplate),
            maxDamage: getBossMaxDamage(boss, bossTemplate),
            criticalChance: getBossCriticalChance(boss, bossTemplate),
            criticalDamage: getBossCriticalDamage(boss, bossTemplate)
        }
    }

    return {
        attack: getBossAttack(boss, bossTemplate),
        defence: getBossDefence(boss, bossTemplate),
        minDamage: getBossMinDamage(boss, bossTemplate),
        maxDamage: getBossMaxDamage(boss, bossTemplate),
        criticalChance: getBossCriticalChance(boss, bossTemplate),
        criticalDamage: getBossCriticalDamage(boss, bossTemplate)
    }
};